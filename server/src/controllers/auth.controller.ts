import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { fallbackUsername, verifyGoogleAccessToken } from "../services/auth.service";

type AuthRequest = Request & {
  file?: Express.Multer.File;
  userId?: string;
};

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

function getAuthSecrets(res: Response): { jwtSecret: string; refreshSecret: string } | null {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret =
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

  if (!jwtSecret || !refreshSecret) {
    res.status(500).json({ message: "Server auth configuration is missing" });
    return null;
  }

  return { jwtSecret, refreshSecret };
}

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function signAccessToken(userId: string, jwtSecret: string): string {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function signRefreshToken(userId: string, refreshSecret: string): string {
  return jwt.sign({ userId }, refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export async function register(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const secrets = getAuthSecrets(res);
  if (!secrets) return;

  const { username, email, password } = req.body;
  const profileImageFromFile = authReq.file ? `/uploads/profile/${authReq.file.filename}` : undefined;
  const profileImageFromBody = typeof req.body.profileImage === "string" ? req.body.profileImage : undefined;
  const profileImage = profileImageFromFile || profileImageFromBody;

  if (!username || !email || !password) {
    res.status(400).json({ message: "username, email and password are required" });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash, profileImage });

  const accessToken = signAccessToken(user._id.toString(), secrets.jwtSecret);
  const refreshToken = signRefreshToken(user._id.toString(), secrets.refreshSecret);
  await User.findByIdAndUpdate(user._id, { refreshToken });

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({
    token: accessToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      authProvider: user.authProvider ?? "local",
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const secrets = getAuthSecrets(res);
  if (!secrets) return;

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash) {
    res.status(400).json({ message: "This account uses Google sign-in" });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const accessToken = signAccessToken(user._id.toString(), secrets.jwtSecret);
  const refreshToken = signRefreshToken(user._id.toString(), secrets.refreshSecret);
  await User.findByIdAndUpdate(user._id, { refreshToken });

  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({
    token: accessToken,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      authProvider: user.authProvider ?? "local",
    },
  });
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  const secrets = getAuthSecrets(res);
  if (!secrets) return;

  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ message: "Google access token is required" });
    return;
  }

  try {
    const googleUser = await verifyGoogleAccessToken(String(accessToken));
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      const passwordHash = await bcrypt.hash(`google-${googleUser.googleId}`, 10);
      user = await User.create({
        username: fallbackUsername(googleUser.name, googleUser.email),
        email: googleUser.email,
        passwordHash,
        profileImage: googleUser.picture,
        authProvider: "google",
      });
    } else {
      let changed = false;
      if (!user.profileImage && googleUser.picture) {
        user.profileImage = googleUser.picture;
        changed = true;
      }
      if (user.authProvider !== "google") {
        user.authProvider = "google";
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    const authUser = user;
    const token = signAccessToken(authUser._id.toString(), secrets.jwtSecret);
    const refreshToken = signRefreshToken(authUser._id.toString(), secrets.refreshSecret);
    await User.findByIdAndUpdate(authUser._id, { refreshToken });

    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({
      token,
      user: {
        id: authUser._id,
        username: authUser.username,
        email: authUser.email,
        profileImage: authUser.profileImage,
        authProvider: authUser.authProvider ?? "google",
      },
    });
  } catch {
    res.status(401).json({ message: "Invalid Google credential" });
  }
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthRequest;
  const userId = authReq.userId;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const { username } = req.body;
  if (typeof username === "string" && username.trim().length > 0) {
    user.username = username.trim();
  }

  if (authReq.file) {
    user.profileImage = `/uploads/profile/${authReq.file.filename}`;
  } else if (typeof req.body.profileImage === "string" && req.body.profileImage.trim().length > 0) {
    user.profileImage = req.body.profileImage.trim();
  }

  await user.save();

  res.status(200).json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      profileImage: user.profileImage,
      authProvider: user.authProvider ?? "local",
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const secrets = getAuthSecrets(res);
  if (!secrets) return;

  const token = req.cookies?.refreshToken;

  if (!token) {
    res.status(401).json({ message: "No refresh token" });
    return;
  }

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, secrets.refreshSecret) as unknown as { userId: string };
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user || user.refreshToken !== token) {
    res.status(401).json({ message: "Refresh token mismatch" });
    return;
  }

  const newAccessToken = signAccessToken(user._id.toString(), secrets.jwtSecret);
  res.status(200).json({ token: newAccessToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;

  if (token) {
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: undefined });
  }

  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out" });
}
