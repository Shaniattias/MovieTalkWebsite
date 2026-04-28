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

      const prompt = `You are an expert movie knowledge assistant for a movie discussion platform.

User query: "${trimmedQuery}"

You must follow these three steps carefully before producing any output.

━━━ STEP A — Build a movie knowledge profile for each post ━━━
For EVERY post in the list below:
1. Read the post title and text. They may be in Hebrew or another language.
2. Identify the exact movie being discussed. If the title is in a non-English language, translate it mentally to find the real English movie name.
   Examples: "מהיר ועצבני" = Fast & Furious | "מואנה" = Moana | "הג'וקר" = Joker | "הבית הבובות" = The Doll's House
3. Using your training knowledge about that movie, recall:
   - Confirmed English title
   - Genre(s): action / animation / horror / comedy / thriller / romance / sci-fi / drama / documentary
   - Target audience: children (ages 3–10) / family (all ages) / teens (13–17) / adults (18+)
   - MPAA or equivalent rating (G, PG, PG-13, R, etc.)
   - Main cast members — at least 2–3 actors by name
   - Director
   - Tone: lighthearted / dark / intense / comedic / emotional / suspenseful
   - Themes: friendship / adventure / family / fear / love / survival / humor / etc.
4. If sampleComments are provided, infer community sentiment: positive / negative / neutral / mixed.

━━━ STEP B — Understand the user query ━━━
1. Detect the query language (Hebrew, English, Arabic, etc.) and translate it mentally to English.
2. Determine what the user is looking for. It may be:
   - Genre: "action movies", "kids movies", "horror", "comedy"
   - Audience: "family movies", "movies for kids", "adult movies"
   - Cast or crew: "movies with Sydney Sweeney", "Vin Diesel movies", "movies directed by Nolan"
     → For cast queries: recall which movies that person appeared in, then check if any post discusses those movies
   - Tone or mood: "funny movies", "scary movies", "emotional movies", "dark films"
   - Sentiment: "movies with bad reactions", "movies people hated", "unpopular movies"
     → Check sampleComments for criticism or disappointment, and whether likesCount is very low

━━━ STEP C — Match strictly using your movie knowledge ━━━
- Include a post ONLY if the movie it discusses STRONGLY and CONFIDENTLY fits the query.
- Your decision must be based on what the movie actually is — never on the words written in the post.
- Non-negotiable rules:
  * "kids movie" / "סרטי ילדים" / "family film" → match ONLY G or PG rated children's/family animations and live-action family films (Moana, Toy Story, Frozen, Shrek, Home Alone). Fast & Furious is PG-13 action for adults — NEVER include it. Joker is R-rated — NEVER include it.
  * "action" / "סרטי אקשן" → match action films rated PG-13 or above (Fast & Furious, Mission Impossible, John Wick). Do NOT include animation or romance.
  * "horror" / "scary" / "סרט אימה" → match horror or dark psychological thriller (The Shining, Joker, Hereditary, Get Out). Never match Disney or family films.
  * Cast query (e.g. "סינדי סוויני" = Sydney Sweeney) → first recall all movies Sydney Sweeney is known for (e.g. Anyone But You, Immaculate, Reality, The Housemaid), then match any post that discusses one of those specific movies.
  * Sentiment query ("bad reviews", "תגובות שליליות", "people didn't like it") → match posts where sampleComments express criticism, dissatisfaction, or where likesCount is notably low.
- If you are not fully confident a movie matches — exclude it.
- Prefer returning 0 results over returning wrong results.
- Ideal: 2–4 high-confidence matches.

━━━ POSTS ━━━
${JSON.stringify(compactPosts)}

━━━ OUTPUT ━━━
Return ONLY valid JSON. No markdown. No code fences. No text outside the JSON.

Format when results exist:
{"matchedPostIds":["<id>"],"reasoningSummary":"<one sentence explaining why these posts match>","queryUnderstanding":{"language":"<detected language>","intent":"<user intent in English>","genres":["<genre>"],"audience":["<audience>"],"sentiment":"positive|negative|neutral|any"}}

Format when nothing matches or you are not confident:
{"matchedPostIds":[],"reasoningSummary":"No posts confidently match this query","queryUnderstanding":{"language":"<detected>","intent":"<intent in English>","genres":[],"audience":[],"sentiment":"any"}}`;

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
