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

      const prompt = `You are an expert movie search assistant for a movie discussion platform.

User query: "${trimmedQuery}"

━━━ STEP 1 — Understand the query ━━━
- Detect the language (Hebrew, English, Arabic, etc.).
- Translate it internally to English for all reasoning. Do not output the translation.
- Identify the user's full intent, which may include one or more of:
  * genre (action, horror, comedy, animation, thriller, romance, sci-fi, documentary, etc.)
  * target audience (children, family, teens, adults)
  * mood or tone (funny, scary, emotional, dark, uplifting)
  * community reception — if the user asks for movies "with bad reviews" or "people didn't like" or "תגובות שליליות", focus on sentiment in sampleComments and likesCount

━━━ STEP 2 — Analyze each post using your movie knowledge ━━━
For each post in the list below:
a) Identify the specific movie or franchise being discussed (from title and text).
b) Use your general knowledge to determine:
   - Primary genre
   - Target audience: children (3–10), family (all ages), teens (13–17), adults (18+)
   - Tone: lighthearted / dark / intense / comedic / emotional / suspenseful
   - Themes: friendship, adventure, family, survival, fear, love, humor, etc.
c) If sampleComments exist, infer the community sentiment: positive, negative, neutral, or mixed.

━━━ STEP 3 — Match strictly ━━━
- Include a post ONLY if the movie it discusses STRONGLY matches the user's intent.
- Your reasoning must be based on what the movie actually IS — not on words in the post text.
- Hard rules:
  * "kids movie" / "סרטי ילדים" / "family movie" → ONLY children's/family films (Moana, Toy Story, Frozen, Shrek). NEVER Fast & Furious, Joker, or any adult-rated film.
  * "action" / "סרטי אקשן" → action films for adults/teens (Mission Impossible, Fast & Furious). Not animation or romance.
  * "horror" / "scary" / "סרט אימה" → horror or psychological thriller (The Shining, Joker, Hereditary). Not Disney.
  * "bad reactions" / "negative comments" / "תגובות שליליות" / "אשמח שתציג לי סרט עם תגובות לא טובות" → posts where sampleComments show criticism, disappointment, or negativity, OR where likesCount is very low relative to commentsCount.
- Exclude posts that are only partially or loosely related.
- Prefer 2–4 strong matches over many weak ones.
- Returning zero results is correct if nothing genuinely matches.

━━━ POSTS ━━━
${JSON.stringify(compactPosts)}

━━━ OUTPUT ━━━
Return ONLY valid JSON. No markdown. No code fences. No explanation outside the JSON.

Format:
{"matchedPostIds":["<id>"],"reasoningSummary":"<one sentence>","queryUnderstanding":{"language":"<detected language>","intent":"<user intent in English>","genres":["<genre>"],"audience":["<audience>"],"sentiment":"positive|negative|neutral|any"}}

If nothing matches:
{"matchedPostIds":[],"reasoningSummary":"No posts match the query","queryUnderstanding":{"language":"<detected>","intent":"<intent>","genres":[],"audience":[],"sentiment":"any"}}`;

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
