import { Request, Response } from "express";
import { Like } from "../models/Like";
import { Post } from "../models/Post";

export async function toggleLike(req: Request, res: Response): Promise<void> {
  const userId = (req as any).userId;
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  const existing = await Like.findOne({ postId, userId });

  if (existing) {
    await existing.deleteOne();
  } else {
    await Like.create({ postId, userId });
  }

  const liked = !existing;
  const likesCount = await Like.countDocuments({ postId });
  await Post.findByIdAndUpdate(postId, { $set: { likesCount } });

  res.status(200).json({ liked, likesCount });
}

export async function getLikeStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as any).userId;
  const { postId } = req.params;

  const existing = await Like.findOne({ postId, userId });
  const post = await Post.findById(postId).select("likesCount");

  res.status(200).json({ liked: !!existing, likesCount: post?.likesCount ?? 0 });
}
