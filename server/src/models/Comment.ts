import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  postId: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
}

const commentSchema = new Schema<IComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Comment = model<IComment>("Comment", commentSchema);
