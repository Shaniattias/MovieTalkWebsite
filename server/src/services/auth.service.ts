import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string;

type TokenPayload = {
  userId: string;
  type: "access" | "refresh";
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  authProvider: "local" | "google";
};

export function sanitizeUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
    authProvider: user.authProvider,
  };
}

function signAccessToken(userId: string): string {
  return jwt.sign({ userId, type: "access" } as TokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: "refresh" } as TokenPayload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export async function createSession(user: IUser, tokenToReplace?: string) {
  const accessToken = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());

  const refreshTokens = user.refreshTokens ?? [];
  user.refreshTokens = tokenToReplace
    ? refreshTokens.filter((token) => token !== tokenToReplace)
    : refreshTokens;
  user.refreshTokens.push(refreshToken);

  await user.save();

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(refreshToken: string): TokenPayload {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload;
  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return payload;
}

export async function verifyGoogleAccessToken(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to verify Google access token");
  }

  const data = await res.json() as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!data.email || !data.sub) {
    throw new Error("Invalid Google user info response");
  }

  return {
    googleId: data.sub,
    email: data.email.toLowerCase(),
    name: data.name,
    picture: data.picture,
  };
}

export function fallbackUsername(name: string | undefined, email: string): string {
  if (name && name.trim().length > 0) {
    return name.trim();
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "MovieTalk User";
}
