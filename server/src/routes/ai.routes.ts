import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middleware/auth.middleware";
import { Post } from "../models/Post";
import { Like } from "../models/Like";
import { Comment } from "../models/Comment";

const router = Router();

interface QueryUnderstanding {
  language: string;
  intent: string;
  genres: string[];
  audience: string[];
  sentiment: "positive" | "negative" | "neutral" | "any";
}

interface GeminiSemanticResponse {
  matchedPostIds: string[];
  reasoningSummary: string;
  queryUnderstanding: QueryUnderstanding;
}

function buildRegexFallback(rawQuery: string) {
  const terms = rawQuery.trim().split(/\s+/).filter(Boolean);
  const orClauses = terms.flatMap((term) => {
    const regex = { $regex: term, $options: "i" };
    return [{ title: regex }, { text: regex }];
  });
  return orClauses.length > 0 ? { $or: orClauses } : {};
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

router.post("/search", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({ message: "query is required and must be a non-empty string" });
    return;
  }

  const trimmedQuery = query.trim();
  const userId = (req as any).userId as string;

  // 1. Fetch all posts with enough context for Gemini
  const allPosts = await Post.find({}, "_id title text likesCount commentsCount").lean();
  const allPostIds = allPosts.map((p) => (p._id as any).toString());

  // 2. Fetch up to 3 comments per post for sentiment context
  const allComments = await Comment.find(
    { postId: { $in: allPostIds } },
    "postId text"
  ).lean();

  const commentsByPost: Record<string, string[]> = {};
  for (const c of allComments) {
    const pid = (c.postId as any).toString();
    if (!commentsByPost[pid]) commentsByPost[pid] = [];
    if (commentsByPost[pid].length < 3) commentsByPost[pid].push(c.text as string);
  }

  const compactPosts = allPosts.map((p) => {
    const pid = (p._id as any).toString();
    const comments = commentsByPost[pid] ?? [];
    const entry: Record<string, unknown> = {
      id: pid,
      title: p.title,
      text: p.text,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
    };
    if (comments.length > 0) entry.sampleComments = comments;
    return entry;
  });

  let matchedIds: string[] = [];
  let queryUnderstanding: QueryUnderstanding = {
    language: "unknown",
    intent: "",
    genres: [],
    audience: [],
    sentiment: "any",
  };
  let aiSucceeded = false;

  // 3. Try Gemini semantic matching
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && compactPosts.length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an expert multilingual movie search assistant for a movie discussion platform.
You have deep knowledge of movies, franchises, actors, directors, genres, and audiences.

User query: "${trimmedQuery}"

Complete ALL three steps below before producing output.

━━━ STEP 1 — Understand the query ━━━
a) Detect the query language (Hebrew, English, Arabic, etc.).
b) Translate it mentally to English. Do not output the translation.
c) Determine what the user is looking for. It may be one or more of:
   - Genre: action / horror / comedy / romance / animation / thriller / sci-fi / drama
   - Audience: kids / family / teens / adults
   - Mood / tone: funny / scary / emotional / dark / uplifting / suspenseful
   - Cast or crew: a specific actor or director name
   - Sentiment: posts with positive or negative community reactions
   - A specific concept or theme (sea, friendship, revenge, etc.)
d) Build these two sets for use in Step 2:
   EXACT_TERMS — the user's words exactly as typed
   SYNONYM_TERMS — related words in both the query language and English. Examples:
     "ילדים" / "kids" → children, family, animated, animation, Disney, Pixar, G-rated, PG
     "אימה" / "horror" → scary, frightening, thriller, psychological, dark, terrifying
     "אקשן" / "action" → fight, chase, explosion, combat, stunt, PG-13, mission
     "מצחיק" / "funny" → comedy, humor, hilarious, laugh, witty
     "רומנטי" / "romance" → love, relationship, affection, romantic comedy
     "מותח" / "thriller" → suspense, tense, mystery, gripping, psychological
     "עצוב" / "sad" → emotional, drama, tearful, heartbreaking
     "ים" / "sea" → ocean, beach, water, waves, shore, island

━━━ STEP 2 — Analyze each post with THREE checks ━━━
For each post examine ALL text fields: title, text, sampleComments.

CHECK A — Exact text match (highest priority):
  Scan title + text + sampleComments for any word from EXACT_TERMS (case-insensitive).
  If ANY exact term appears verbatim → strong match, include it.
  Example: query "סרט חכם מאוד", comment says "סרט חכם מאוד" → include.

CHECK B — Movie-identity reasoning (second priority):
  1. Identify the movie or franchise discussed in the post.
     Translate the post title if needed to find the real English title.
     Reference examples (do not limit to these):
       "מהיר ועצבני" / "הובס ושאו" → Fast & Furious franchise (PG-13, action, adults)
       "מואנה" → Moana (G, animation, children/family)
       "צעצוע של סיפור" → Toy Story (G, animation, children/family)
       "הג׳וקר" / "ג׳וקר" → Joker (R, dark thriller/drama, adults)
       "הניצוץ" → The Shining (R, horror, adults)
       "קפוא" / "פרוזן" → Frozen (G, animation, children/family)
       "שרק" → Shrek (PG, animation, family)
       "לבד בבית" → Home Alone (PG, comedy, family)
  2. Using your training knowledge of that identified movie, recall:
     - Genre(s)
     - MPAA rating (G / PG / PG-13 / R)
     - Target audience: children (3–10) / family (all ages) / teens / adults
     - Tone, themes, main cast
  3. Does the identified movie's genre / audience / tone match the query intent?
     If YES and confidently → include.
     If uncertain or only partial match → exclude.

CHECK C — Cast / crew match:
  If the query mentions a person's name (e.g., "סינדי סוויני" = Sydney Sweeney):
  1. Recall the movies that person is known for.
  2. Check if any post discusses one of those movies → include.

CHECK D — Sentiment match:
  If the query asks about bad reviews / negative reactions / "תגובות שליליות":
  → Inspect sampleComments for criticism or disappointment.
  → Very low likesCount relative to commentsCount is also a signal.

━━━ STEP 3 — Filter and rank ━━━
Priority order: CHECK A > CHECK B > CHECK C > CHECK D.
Hard genre rules based on actual movie knowledge — not on words in the post:
  * "kids" / "ילדים" / "family" → ONLY G or PG children's/family films. NEVER Fast & Furious (PG-13), NEVER Joker (R).
  * "action" / "אקשן" / "פעולה" → action-genre films only. Not animation, not romance.
  * "horror" / "אימה" / "מפחיד" → horror or dark psychological thriller only. Never Disney or family films.
Exclude any post where the match is weak, coincidental, or uncertain.
Prefer 2–5 high-confidence results.
Zero results is the correct answer when nothing truly fits.

━━━ POSTS ━━━
${JSON.stringify(compactPosts)}

━━━ OUTPUT ━━━
Return ONLY valid JSON. No markdown. No code fences. No text outside the JSON.

Format when results exist:
{"matchedPostIds":["<id>"],"reasoningSummary":"<one sentence>","queryUnderstanding":{"language":"<detected>","intent":"<English intent>","genres":["<genre>"],"audience":["<audience>"],"sentiment":"positive|negative|neutral|any"}}

Format when nothing matches or confidence is low:
{"matchedPostIds":[],"reasoningSummary":"No posts confidently match this query","queryUnderstanding":{"language":"<detected>","intent":"<English intent>","genres":[],"audience":[],"sentiment":"any"}}`;

      const result = await model.generateContent(prompt);
      const raw = stripCodeFences(result.response.text().trim());
      const parsed = JSON.parse(raw) as GeminiSemanticResponse;

      if (
        parsed &&
        Array.isArray(parsed.matchedPostIds) &&
        parsed.queryUnderstanding &&
        Array.isArray(parsed.queryUnderstanding.genres) &&
        Array.isArray(parsed.queryUnderstanding.audience)
      ) {
        const validIds = new Set(allPostIds);
        matchedIds = parsed.matchedPostIds.filter((id) => validIds.has(id));
        queryUnderstanding = parsed.queryUnderstanding;
        aiSucceeded = true;
      }
    } catch {
      // fall through to regex fallback
    }
  }

  // 4. Fetch full posts — AI results or regex fallback
  const posts = aiSucceeded
    ? await Post.find({ _id: { $in: matchedIds } })
        .populate("author", "username email profileImage")
        .sort({ createdAt: -1 })
    : await Post.find(buildRegexFallback(trimmedQuery))
        .populate("author", "username email profileImage")
        .sort({ createdAt: -1 });

  // 5. Add liked flag
  const likedSet = new Set<string>();
  if (posts.length > 0) {
    const pids = posts.map((p) => p._id);
    const likes = await Like.find({ userId, postId: { $in: pids } }).select("postId");
    likes.forEach((l) => likedSet.add(l.postId.toString()));
  }

  const results = posts.map((p) => ({
    ...p.toObject(),
    liked: likedSet.has(p._id.toString()),
  }));

  // Map to the frontend AiSearchQuery shape (genres/titles/themes/moods/keywords)
  res.status(200).json({
    results,
    query: {
      genres: queryUnderstanding.genres,
      titles: [],
      themes: queryUnderstanding.audience,
      moods: queryUnderstanding.sentiment !== "any" ? [queryUnderstanding.sentiment] : [],
      keywords: queryUnderstanding.intent ? [queryUnderstanding.intent] : [],
    },
  });
});

export default router;
