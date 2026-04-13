import { Request, Response } from "express";
import { Post } from "../models/Post";

const DEFAULT_LIMIT = 10;

export async function getPosts(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT);
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find().populate("author", "username").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Post.countDocuments(),
  ]);

  res.status(200).json({ posts, total, page, limit });
}

export async function getPostById(req: Request, res: Response): Promise<void> {
  const post = await Post.findById(req.params.id).populate("author", "username");

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  res.status(200).json(post);
}

export async function getPostsByUser(req: Request, res: Response): Promise<void> {
  const posts = await Post.find({ author: req.params.userId })
    .populate("author", "username")
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

  const post = await Post.create({ author: authorId, title, text });
  await post.populate("author", "username");

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

  await post.save();
  await post.populate("author", "username");

  res.status(200).json(post);
}

export async function deletePost(req: Request, res: Response): Promise<void> {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  if (post.author.toString() !== (req as any).userId) {
    res.status(403).json({ message: "Not authorized to delete this post" });
    return;
  }

  await post.deleteOne();
  res.status(200).json({ message: "Post deleted" });
}
