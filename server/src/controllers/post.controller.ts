import { Request, Response } from "express";
import { Post } from "../models/Post";
import { Like } from "../models/Like";
import fs from "fs";
import path from "path";

const DEFAULT_LIMIT = 10;
const POST_IMAGES_DIR = path.resolve(__dirname, "../../uploads/post-images");

export async function getPosts(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT);
  const skip = (page - 1) * limit;

  const userId = (req as any).userId as string | undefined;

  const [posts, total] = await Promise.all([
    Post.find()
      .populate("author", "username email profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Post.countDocuments(),
  ]);

  let likedSet = new Set<string>();
  if (userId && posts.length > 0) {
    const postIds = posts.map((p) => p._id);
    const likes = await Like.find({ userId, postId: { $in: postIds } }).select("postId");
    likes.forEach((l) => likedSet.add(l.postId.toString()));
  }

  const postsWithLiked = posts.map((p) => ({
    ...p.toObject(),
    liked: likedSet.has(p._id.toString()),
  }));

  res.status(200).json({ posts: postsWithLiked, total, page, limit });
}

export async function getPostById(req: Request, res: Response): Promise<void> {
  const post = await Post.findById(req.params.id).populate("author", "username email profileImage");

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.status(200).json(post);
}

export async function getPostsByUser(req: Request, res: Response): Promise<void> {
  const posts = await Post.find({ author: req.params.userId })
    .populate("author", "username email profileImage")
    .sort({ createdAt: -1 });

  res.status(200).json(posts);
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const { title, text } = req.body;
  const authorId = (req as any).userId;

  if (!title || !text) {
    res.status(400).json({ message: "title and text are required" });
    return;
  }

  const imageUrl = req.file ? `/uploads/post-images/${req.file.filename}` : undefined;

  const post = await Post.create({ author: authorId, title, text, imageUrl });
  await post.populate("author", "username email profileImage");

  res.status(201).json(post);
}

export async function updatePost(req: Request, res: Response): Promise<void> {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  if (post.author.toString() !== (req as any).userId) {
    res.status(403).json({ message: "Not authorized to update this post" });
    return;
  }

  const { title, text } = req.body;
  if (title) post.title = title;
  if (text) post.text = text;
  if (req.file) post.imageUrl = `/uploads/post-images/${req.file.filename}`;

  await post.save();
  await post.populate("author", "username email profileImage");

  res.status(200).json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    if (post.author.toString() !== (req as any).userId) {
      res.status(403).json({ message: "Not authorized to delete this post" });
      return;
    }

    if (post.imageUrl) {
      const imageFileName = path.basename(post.imageUrl);
      const candidatePath = path.resolve(POST_IMAGES_DIR, imageFileName);
      const isInsideUploadsDir =
        candidatePath === POST_IMAGES_DIR || candidatePath.startsWith(`${POST_IMAGES_DIR}${path.sep}`);

      if (isInsideUploadsDir) {
        try {
          await fs.promises.unlink(candidatePath);
        } catch (error: unknown) {
          const fsError = error as NodeJS.ErrnoException;
          if (fsError.code !== "ENOENT") {
            console.error("Failed to delete post image:", fsError);
          }
        }
      }
    }

    await post.deleteOne();
    res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    console.error("deletePost error:", error);
    res.status(500).json({ message: "Failed to delete post" });
  }
}
