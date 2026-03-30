import { Router } from "express";
import { createPost, getPosts } from "../controllers/post.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/", getPosts);
router.post("/", authMiddleware, createPost);

export default router;
