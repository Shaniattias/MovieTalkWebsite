import { Router } from "express";
import {
  getPosts,
  getPostById,
  getPostsByUser,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/post.controller";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.middleware";
import { uploadPostImage } from "../middleware/upload.middleware";

const router = Router();

router.get("/", optionalAuthMiddleware, getPosts);
router.get("/user/:userId", getPostsByUser);
router.get("/:id", getPostById);
router.post("/", authMiddleware, uploadPostImage.single("image"), createPost);
router.put("/:id", authMiddleware, uploadPostImage.single("image"), updatePost);
router.delete("/:id", authMiddleware, deletePost);

export default router;
