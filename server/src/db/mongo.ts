import mongoose from "mongoose";

export async function connectMongo(mongoUri: string) {
  if (!mongoUri) throw new Error("MONGO_URI is missing");
  await mongoose.connect(mongoUri);
  console.log("✅ MongoDB connected");
}
