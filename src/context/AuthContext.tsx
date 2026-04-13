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
  updateProfile: (updates: { name?: string; avatar?: string }) => void;
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      localStorage.setItem(TOKEN_KEY, session.token);
    } catch (err) {
      console.error("Failed to persist auth state:", err);
    }
  };

  const updateProfile = (updates: { name?: string; avatar?: string }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextName = updates.name ?? prev.name ?? prev.username;
      const nextAvatar = updates.avatar ?? prev.avatar;
      const next: AuthUser = {
        ...prev,
        username: nextName || prev.username,
        name: nextName,
        avatar: nextAvatar,
        profileImage: nextAvatar,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("Failed to persist profile update:", err);
      }
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
