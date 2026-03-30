import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectMongo } from "./db/mongo";

const PORT = Number(process.env.PORT || 5000);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

async function start() {
  await connectMongo(process.env.MONGO_URI || "");
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
