import { Router } from "express";
import { googleAuth, login, logout, refresh, register } from "../controllers/auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
