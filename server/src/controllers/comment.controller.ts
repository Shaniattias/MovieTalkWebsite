import { Request, Response } from "express";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";

export async function getComments(req: Request, res: Response): Promise<void> {
  const comments = await Comment.find({ postId: req.params.postId })
    .populate("author", "username")
    .sort({ createdAt: 1 });

  res.status(200).json(comments);
}

export async function createComment(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  const authorId = (req as any).userId;
  const { postId } = req.params;

  if (!text) {
    res.status(400).json({ message: "text is required" });
    return;
  }

  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ message: "Post not found" });
    return;
  }

  const comment = await Comment.create({ postId, author: authorId, text });
  await comment.populate("author", "username");

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  res.status(201).json(comment);
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    res.status(404).json({ message: "Comment not found" });
    return;
  }

  if (comment.author.toString() !== (req as any).userId) {
    res.status(403).json({ message: "Not authorized to delete this comment" });
    return;
  }

  await comment.deleteOne();
  await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });

  res.status(200).json({ message: "Comment deleted" });
}
