import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middleware/auth.middleware";
import { Post } from "../models/Post";
import { Like } from "../models/Like";

const router = Router();

interface GeminiSearchQuery {
  genres: string[];
  titles: string[];
  themes: string[];
  moods: string[];
  keywords: string[];
}

const GEMINI_PROMPT = `You are a movie discussion search assistant. Extract from the user's natural language query: movie genres, movie titles/franchises, themes, moods, and keywords. Return ONLY a JSON object with: { genres: string[], titles: string[], themes: string[], moods: string[], keywords: string[] }`;

async function extractSearchTerms(userQuery: string): Promise<GeminiSearchQuery | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(`${GEMINI_PROMPT}\n\nUser query: "${userQuery}"`);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(jsonText);

    if (
      parsed &&
      Array.isArray(parsed.genres) &&
      Array.isArray(parsed.titles) &&
      Array.isArray(parsed.themes) &&
      Array.isArray(parsed.moods) &&
      Array.isArray(parsed.keywords)
    ) {
      return parsed as GeminiSearchQuery;
    }
    return null;
  } catch {
    return null;
  }
}

function buildSearchQuery(extracted: GeminiSearchQuery | null, rawQuery: string) {
  const terms: string[] = extracted
    ? [
        ...extracted.genres,
        ...extracted.titles,
        ...extracted.themes,
        ...extracted.moods,
        ...extracted.keywords,
      ].filter((t) => t.length > 0)
    : [rawQuery];

  if (terms.length === 0) {
    terms.push(rawQuery);
  }

  const orClauses = terms.flatMap((term) => {
    const regex = { $regex: term, $options: "i" };
    return [{ title: regex }, { text: regex }];
  });

  return { $or: orClauses };
}

router.post("/search", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({ message: "query is required and must be a non-empty string" });
    return;
  }

  const trimmedQuery = query.trim();
  const userId = (req as any).userId as string;

  const extracted = await extractSearchTerms(trimmedQuery);
  const mongoQuery = buildSearchQuery(extracted, trimmedQuery);

  const posts = await Post.find(mongoQuery)
    .populate("author", "username email profileImage")
    .sort({ createdAt: -1 });

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

  const queryMeta: GeminiSearchQuery = extracted ?? {
    genres: [],
    titles: [],
    themes: [],
    moods: [],
    keywords: [trimmedQuery],
  };

  res.status(200).json({ results, query: queryMeta });
});

export default router;
