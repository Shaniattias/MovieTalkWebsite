import { Router } from "express";
import { login, register, updateProfile } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.post("/register", upload.single("profileImage"), register);
router.post("/login", login);
router.patch("/profile", authMiddleware, upload.single("profileImage"), updateProfile);

export default router;
