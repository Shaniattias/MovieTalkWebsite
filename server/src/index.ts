import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import app from "./app";
import { connectMongo } from "./db/mongo";

const PORT = Number(process.env.PORT || 5000);

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

async function start() {
  const mongoUri = process.env.MONGO_URI || "";
  console.log(
    "🔌 MONGO_URI →",
    mongoUri
      ? mongoUri.replace(/:([^:@]+)@/, ":***@")
      : "MISSING — check server/.env"
  );
  await connectMongo(mongoUri);
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
