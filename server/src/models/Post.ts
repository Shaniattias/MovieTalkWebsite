import { Schema, model, Document, Types } from "mongoose";

export interface IPost extends Document {
  author: Types.ObjectId;
  title: string;
  text: string;
  imageUrl?: string;
  commentsCount: number;
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Post = model<IPost>("Post", postSchema);
