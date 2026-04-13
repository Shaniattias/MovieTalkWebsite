import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import {
  createSession,
  fallbackUsername,
  sanitizeUser,
  verifyGoogleAccessToken,
  verifyRefreshToken,
} from "../services/auth.service";

function sendAuthResponse(res: Response, status: number, payload: {
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof sanitizeUser>;
}): void {
  res.status(status).json({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    token: payload.accessToken,
    user: payload.user,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

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
  const user = await User.create({
    username,
    email: String(email).toLowerCase(),
    passwordHash,
    authProvider: "local",
    refreshTokens: [],
  });

  const { accessToken, refreshToken } = await createSession(user);

  sendAuthResponse(res, 201, {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  });
}

export async function login(req: Request, res: Response): Promise<void> {
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

  const { accessToken, refreshToken } = await createSession(user);

  sendAuthResponse(res, 200, {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  });
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { accessToken: googleAccessToken } = req.body;

  if (!googleAccessToken) {
    res.status(400).json({ message: "Google access token is required" });
    return;
  }

  try {
    const googleUser = await verifyGoogleAccessToken(String(googleAccessToken));
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      user = await User.create({
        username: fallbackUsername(googleUser.name, googleUser.email),
        email: googleUser.email,
        profileImage: googleUser.picture,
        googleId: googleUser.googleId,
        authProvider: "google",
        refreshTokens: [],
      });
    } else {
      let changed = false;

      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        changed = true;
      }

      if (!user.profileImage && googleUser.picture) {
        user.profileImage = googleUser.picture;
        changed = true;
      }

      if (!user.passwordHash && user.authProvider !== "google") {
        user.authProvider = "google";
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    const { accessToken, refreshToken } = await createSession(user);

    sendAuthResponse(res, 200, {
      accessToken,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("GOOGLE_CLIENT_ID")) {
      res.status(500).json({ message: "Google auth is not configured on the server" });
      return;
    }

    res.status(401).json({ message: "Invalid Google credential" });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(String(refreshToken));
    const user = await User.findOne({
      _id: payload.userId,
      refreshTokens: String(refreshToken),
    });

    if (!user) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const nextTokens = await createSession(user, String(refreshToken));
    sendAuthResponse(res, 200, {
      ...nextTokens,
      user: sanitizeUser(user),
    });
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ message: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyRefreshToken(String(refreshToken));
    await User.updateOne(
      { _id: payload.userId },
      { $pull: { refreshTokens: String(refreshToken) } }
    );
  } catch {
    await User.updateOne(
      { refreshTokens: String(refreshToken) },
      { $pull: { refreshTokens: String(refreshToken) } }
    );
  }

  res.status(200).json({ message: "Logged out" });
}
