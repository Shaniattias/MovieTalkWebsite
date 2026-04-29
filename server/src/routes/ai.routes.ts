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
  console.log("🔥 AI SEARCH ROUTE HIT:", query);

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    res.status(400).json({ message: "query is required and must be a non-empty string" });
    return;
  }

  const trimmedQuery = query.trim();
  const userId = (req as any).userId as string;

  const allPosts = await Post.find({}, "_id title text likesCount commentsCount").lean();
  const allPostIds = allPosts.map((p) => (p._id as any).toString());

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

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && compactPosts.length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
You are a smart movie search assistant.

User query: "${trimmedQuery}"

Your job:
Find which posts match the user query.

IMPORTANT:
- Understand the meaning of the query, not just exact words.
- Identify the movie in each post using title and text.
- Use your general movie knowledge to infer genre, audience, tone, and themes.
- Also support exact text search: if the query appears exactly in title, text, or sampleComments, include that post.

Examples:
- "מהיר ועצבני" = Fast & Furious = action movie
- "הובס ושאו" = Hobbs & Shaw = Fast & Furious spin-off = action movie
- "מואנה" = Moana = kids / family movie
- "שכחו אותי בבית" = Home Alone = family comedy
- "גוקר" / "ג׳וקר" = Joker = dark drama / psychological thriller
- "הניצוץ" = The Shining = horror

User intent examples:
- "אקשן" / "סרטי אקשן" / "פעולה" => action movies
- "סרטי ילדים" / "ילדים" => kids or family movies
- "אימה" / "מפחיד" => horror or scary movies
- "מותחן" / "מתח" => thriller or suspense movies
- "מצחיק" / "קומדיה" => comedy movies
- "ים" / "חוף" => sea, ocean, beach, island, water related posts

Rules:
1. Include exact text matches.
2. Include posts where the movie identity clearly matches the user intent.
3. Include strong synonym/semantic matches.
4. If a post is clearly unrelated, exclude it.
5. Prefer accurate results over many weak results.

POSTS:
${JSON.stringify(compactPosts)}

Return ONLY valid JSON:
{
  "matchedPostIds": ["id1","id2"],
  "reasoningSummary": "short explanation",
  "queryUnderstanding": {
    "language": "",
    "intent": "",
    "genres": [],
    "audience": [],
    "sentiment": "any"
  }
}
`;

      const result = await model.generateContent(prompt);
      const raw = stripCodeFences(result.response.text().trim());
      console.log("🤖 GEMINI RAW:", raw);

      const parsed = JSON.parse(raw) as GeminiSemanticResponse;

      if (parsed && Array.isArray(parsed.matchedPostIds)) {
        const validIds = new Set(allPostIds);
        matchedIds = parsed.matchedPostIds.filter((id) => validIds.has(id));
        queryUnderstanding = parsed.queryUnderstanding ?? queryUnderstanding;
        aiSucceeded = true;
      }
    } catch (err) {
      console.error("❌ GEMINI ERROR:", err);
    }
  }

  // 4. Fetch posts — combine AI results + regular text search
  const aiPosts =
    aiSucceeded && matchedIds.length > 0
      ? await Post.find({ _id: { $in: matchedIds } })
          .populate("author", "username email profileImage")
          .sort({ createdAt: -1 })
      : [];

  const fallbackPosts = await Post.find(buildRegexFallback(trimmedQuery))
    .populate("author", "username email profileImage")
    .sort({ createdAt: -1 });

  const posts = Array.from(
    new Map(
      [...aiPosts, ...fallbackPosts].map((post) => [
        post._id.toString(),
        post,
      ])
    ).values()
  );

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