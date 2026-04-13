import { Schema, model, Document, Types } from "mongoose";

export interface ILike extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
}

const likeSchema = new Schema<ILike>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const Like = model<ILike>("Like", likeSchema);
