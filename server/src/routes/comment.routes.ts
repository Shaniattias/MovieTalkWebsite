import { Router } from "express";
import { getComments, createComment, deleteComment } from "../controllers/comment.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.get("/:postId", getComments);
router.post("/:postId", authMiddleware, createComment);
router.delete("/:id", authMiddleware, deleteComment);

export default router;
