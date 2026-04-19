import { Router } from "express";
import { googleAuth, login, logout, refresh, register, updateProfile } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/register", upload.single("profileImage"), register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.patch("/profile", authMiddleware, upload.single("profileImage"), updateProfile);

export default router;
