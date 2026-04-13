import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = "1h";

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
  const user = await User.create({ username, email, passwordHash });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(201).json({
    token,
    user: { id: user._id, username: user.username, email: user.email },
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

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  res.status(200).json({
    token,
    user: { id: user._id, username: user.username, email: user.email },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;

  if (!token) {
    res.status(401).json({ message: "No refresh token" });
    return;
  }

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string };
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const user = await User.findById(payload.userId);
  if (!user || user.refreshToken !== token) {
    res.status(401).json({ message: "Refresh token mismatch" });
    return;
  }

  const newAccessToken = signAccessToken(user._id.toString());
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
