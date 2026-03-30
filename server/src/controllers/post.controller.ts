import { Request, Response } from "express";
import { Post } from "../models/Post";

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

export async function getPosts(_req: Request, res: Response): Promise<void> {
  const posts = await Post.find()
    .populate("author", "username")
    .sort({ createdAt: -1 });

  res.status(200).json(posts);
}
