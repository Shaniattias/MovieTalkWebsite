import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import multer from "multer";
import authRoutes from "./routes/auth.routes";
import postRoutes from "./routes/post.routes";
import commentRoutes from "./routes/comment.routes";
import likeRoutes from "./routes/like.routes";
import aiRoutes from "./routes/ai.routes"

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

// Configure payload size limits for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/ai", aiRoutes);

// Error handling middleware for file uploads and other errors
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Image is too large. Max size is 10MB." });
      return;
    }
    if (err.code === "LIMIT_PART_COUNT") {
      res.status(400).json({ message: "Too many file parts." });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof Error && /Only \.jpg, \.jpeg, and \.png images are allowed/i.test(err.message)) {
    res.status(400).json({ message: err.message });
    return;
  }

  next(err);
});

export default app;
