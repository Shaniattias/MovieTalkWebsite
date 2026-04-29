import { Router } from "express";
import { toggleLike, getLikeStatus } from "../controllers/like.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /likes/{postId}:
 *   post:
 *     tags: [Users]
 *     summary: Toggle like on a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.post("/:postId", authMiddleware, toggleLike);

/**
 * @swagger
 * /likes/{postId}/status:
 *   get:
 *     tags: [Users]
 *     summary: Get like status for a post
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like status
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
router.get("/:postId/status", authMiddleware, getLikeStatus);

export default router;
