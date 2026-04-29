import { Router } from "express";
import { googleAuth, login, logout, refresh, register, updateProfile } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { uploadProfileImage } from "../middleware/upload.middleware";

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", uploadProfileImage.single("profileImage"), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post("/login", login);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Google authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Bad request
 */
router.post("/google", googleAuth);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Unauthorized
 */
router.post("/refresh", refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", logout);

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update user profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Bad request
 */
router.patch("/profile", authMiddleware, uploadProfileImage.single("profileImage"), updateProfile);

export default router;
