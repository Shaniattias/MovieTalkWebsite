import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  profileImage?: string;
  googleId?: string;
  authProvider: "local" | "google";
  refreshTokens: string[];
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    profileImage: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true,
    },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
