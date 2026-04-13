import { Router } from "express";
import { toggleLike, getLikeStatus } from "../controllers/like.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/:postId", authMiddleware, toggleLike);
router.get("/:postId/status", authMiddleware, getLikeStatus);

export default router;
