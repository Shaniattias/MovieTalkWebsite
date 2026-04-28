import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middleware/auth.middleware";
import { Post } from "../models/Post";
import { Like } from "../models/Like";

const router = Router();

interface InterpretedQuery {
  genres: string[];
  themes: string[];
  moods: string[];
  keywords: string[];
}

interface GeminiSemanticResponse {
  matchedPostIds: string[];
  reason: string;
  interpretedQuery: InterpretedQuery;
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

  // 1. Fetch all posts compactly for Gemini context
  const allPosts = await Post.find({}, "_id title text").lean();
  const compactPosts = allPosts.map((p) => ({
    id: (p._id as any).toString(),
    title: p.title,
    text: p.text,
  }));

  let matchedIds: string[] = [];
  let interpretedQuery: InterpretedQuery = { genres: [], themes: [], moods: [], keywords: [] };
  let aiSucceeded = false;

  // 2. Try Gemini semantic matching
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && compactPosts.length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `You are an expert movie search assistant for a movie discussion platform.

User query: "${trimmedQuery}"

Step 1 — Language detection and translation:
The query may be in any language (Hebrew, Arabic, Spanish, etc.).
Internally translate it to English before reasoning. Do not output the translation.

Step 2 — For each post below, use your general movie knowledge to:
- Identify the exact movie or franchise being discussed based on the title and text.
- Determine that movie's: primary genre, target audience (children / family / teens / adults), tone (lighthearted / dark / intense / comedic), and main themes.

Step 3 — Match strictly:
- A post matches ONLY if the movie it discusses strongly fits the user's intent.
- Base this on what the movie actually IS, not on words in the post text.
- Examples of correct reasoning:
  * Query "kids movie" or "סרטי ילדים" → match Moana, Toy Story, Finding Nemo. Do NOT match Fast & Furious, Joker, or any adult action/thriller.
  * Query "action movie" → match Mission Impossible, Fast & Furious. Do NOT match Moana or romantic comedies.
  * Query "horror" or "scary" → match The Shining, Joker. Do NOT match Disney or family films.
  * Query "romantic comedy" → match When Harry Met Sally, Crazy Rich Asians. Do NOT match action or horror.
- If a movie is only loosely related, do NOT include it.
- It is correct and acceptable to return zero matches if nothing truly fits.
- Prefer 2–3 accurate results over 6–8 weak ones.

Available posts:
${JSON.stringify(compactPosts)}

Return ONLY a valid JSON object. No markdown, no explanation, no code fences.

Required format:
{"matchedPostIds":["<id>"],"reason":"<brief reason in English>","interpretedQuery":{"genres":["<genre>"],"themes":["<theme>"],"moods":["<mood>"],"keywords":["<keyword>"]}}

If nothing matches, return: {"matchedPostIds":[],"reason":"No posts match the query","interpretedQuery":{"genres":[],"themes":[],"moods":[],"keywords":[]}}`;

      const result = await model.generateContent(prompt);
      const raw = stripCodeFences(result.response.text().trim());
      const parsed = JSON.parse(raw) as GeminiSemanticResponse;

      if (
        parsed &&
        Array.isArray(parsed.matchedPostIds) &&
        parsed.interpretedQuery &&
        Array.isArray(parsed.interpretedQuery.genres) &&
        Array.isArray(parsed.interpretedQuery.themes) &&
        Array.isArray(parsed.interpretedQuery.moods) &&
        Array.isArray(parsed.interpretedQuery.keywords)
      ) {
        const validIds = new Set(compactPosts.map((p) => p.id));
        matchedIds = parsed.matchedPostIds.filter((id) => validIds.has(id));
        interpretedQuery = parsed.interpretedQuery;
        aiSucceeded = matchedIds.length > 0;
      }
    } catch {
      // fall through to regex fallback
    }
  }

  // 3. Fetch posts — AI results or regex fallback
  const posts = aiSucceeded
    ? await Post.find({ _id: { $in: matchedIds } })
        .populate("author", "username email profileImage")
        .sort({ createdAt: -1 })
    : await Post.find(buildRegexFallback(trimmedQuery))
        .populate("author", "username email profileImage")
        .sort({ createdAt: -1 });

  // 4. Add liked flag
  let likedSet = new Set<string>();
  if (posts.length > 0) {
    const postIds = posts.map((p) => p._id);
    const likes = await Like.find({ userId, postId: { $in: postIds } }).select("postId");
    likes.forEach((l) => likedSet.add(l.postId.toString()));
  }

  const results = posts.map((p) => ({
    ...p.toObject(),
    liked: likedSet.has(p._id.toString()),
  }));

  // titles kept as [] to stay compatible with the frontend AiSearchQuery type
  res.status(200).json({
    results,
    query: {
      genres: interpretedQuery.genres,
      titles: [],
      themes: interpretedQuery.themes,
      moods: interpretedQuery.moods,
      keywords: interpretedQuery.keywords,
    },
  });
});

export default router;
