import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../lib/auth";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  profileImage?: string;
  authProvider: "local" | "google";
};

type Session = {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    profileImage?: string;
    authProvider?: "local" | "google";
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  completeAuth: (session: Session) => void;
  updateProfile: (updates: Pick<AuthUser, "name" | "avatar">) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "movietalk_user";
const TOKEN_KEY = "movietalk_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser) as AuthUser);
      setAccessToken(storedToken);
    }
    setIsInitializing(false);
  }, []);

  const completeAuth = (session: Session) => {
    const u: AuthUser = {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      name: session.user.username,
      avatar: session.user.profileImage,
      profileImage: session.user.profileImage,
      authProvider: session.user.authProvider ?? "local",
    };
    setUser(u);
    setAccessToken(session.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, session.token);
  };

  const updateProfile = (updates: Pick<AuthUser, "name" | "avatar">) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next: AuthUser = {
        ...prev,
        name: updates.name,
        avatar: updates.avatar,
        profileImage: updates.avatar,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with cleanup even if server call fails
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user && !!accessToken,
      isInitializing,
      completeAuth,
      updateProfile,
      logout,
    }),
    [user, accessToken, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
