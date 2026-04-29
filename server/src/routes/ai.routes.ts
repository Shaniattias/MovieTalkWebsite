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

      const prompt = `You are an expert multilingual search assistant for a movie discussion platform.

User query: "${trimmedQuery}"

Follow these steps in order before producing any output.

━━━ STEP 1 — Understand and expand the query ━━━
a) Detect the query language (Hebrew, English, Arabic, etc.).
b) Translate the query mentally to English for reasoning. Do not output this translation.
c) Extract all key terms from the query.
d) For each key term, generate synonyms and closely related words in BOTH the original language AND English. Examples:
   - "ים" → sea, ocean, beach, waves, shore, חוף, אוקיינוס, גלים
   - "אימה" / "מפחיד" → horror, scary, frightening, terrifying, thriller, suspense, dark
   - "מצחיק" → comedy, funny, humor, hilarious, laugh, קומדיה
   - "רומנטי" / "אהבה" → romance, love, romantic, relationship, affection
   - "פעולה" → action, fight, explosions, chase, battle, combat
   - "ילדים" / "משפחה" → kids, children, family, animated, animation, Disney, Pixar
   - "עצוב" → sad, emotional, tearful, dramatic, heartbreaking
   - "מותח" → thriller, suspense, tense, gripping, mystery
e) Build two sets you will use in Step 2:
   - EXACT_TERMS: the original query words exactly as written by the user
   - SEMANTIC_TERMS: all synonyms and related words you generated above

━━━ STEP 2 — Analyze each post ━━━
For each post, examine ALL available text: title, text, and sampleComments.

A) EXACT MATCH — check first, highest priority:
   Scan title + text + sampleComments for any word from EXACT_TERMS (case-insensitive, ignore punctuation).
   If ANY exact term appears verbatim → this post is a strong candidate, include it.
   Example: if the user searched "סרט חכם מאוד" and a comment contains exactly "סרט חכם מאוד" → include.

B) SEMANTIC MATCH — check second:
   1. Identify the movie being discussed in the post. If the title is in Hebrew or another language, translate it mentally to the English movie name.
      (e.g., "מהיר ועצבני" = Fast & Furious | "מואנה" = Moana | "הג'וקר" = Joker)
   2. Using your training knowledge about that movie, recall its genre, audience, tone, cast, and themes.
   3. Does the post content or the movie itself relate to the SEMANTIC_TERMS or the query intent?
      - If the connection is strong and confident → include.
      - If the connection is weak, partial, or uncertain → exclude.

C) CAST / CREW MATCH — for queries that mention a person's name:
   1. Identify who the user is searching for (e.g., "סינדי סוויני" = Sydney Sweeney).
   2. Recall all movies that person is known for from your training data.
   3. Check if any post discusses one of those movies → include those posts.

D) SENTIMENT MATCH — for queries about reactions or reviews:
   If the query asks for "bad reviews", "תגובות שליליות", "movies people hated", etc.:
   → Check sampleComments for criticism, disappointment, or negativity.
   → Also consider very low likesCount relative to commentsCount as a signal.

━━━ STEP 3 — Rank and filter ━━━
- EXACT matches have highest priority — always include them if found.
- Strong SEMANTIC matches come second.
- Exclude posts with only a weak or coincidental connection.
- Non-negotiable genre rules (based on actual movie knowledge, not post text):
  * "kids" / "ילדים" / "family" → ONLY G or PG rated children's/family films. Never Fast & Furious, Joker, or R-rated films.
  * "action" / "אקשן" → PG-13 or above action films. Not animation, not romance.
  * "horror" / "scary" / "אימה" → horror or dark thriller. Never Disney/family films.
- Prefer 2–5 accurate results over many weak ones.
- Returning zero results is correct and preferred over returning wrong results.

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
