import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/** Sets req.userId if a valid Bearer token is present, but never blocks the request. */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
        userId: string;
        type?: "access" | "refresh";
      };
      if (!payload.type || payload.type === "access") {
        (req as any).userId = payload.userId;
      }
    } catch {
      // token invalid — proceed without userId
    }
  }
  next();
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      type?: "access" | "refresh";
    };

    if (payload.type && payload.type !== "access") {
      res.status(401).json({ message: "Invalid token type" });
      return;
    }

    (req as any).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
