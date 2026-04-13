import React, { createContext, useContext, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  authProvider: "local" | "google";
  name: string;
  avatar?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loginMock: (email: string, name?: string, avatar?: string) => void;
  updateProfile: (updates: Pick<AuthUser, "name" | "avatar">) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "movietalk_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const persistSession = (next: StoredAuth | null) => {
    if (!next) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const clearSession = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    persistSession(null);
  };

  const loginMock = (email: string, name?: string, avatar?: string) => {
    const u: AuthUser = { email, name, avatar };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  };

  const updateProfile = (updates: Pick<AuthUser, "name" | "avatar">) => {
    setUser((prev) => {
      if (!prev) return prev;
      const nextUser: AuthUser = {
        ...prev,
        name: updates.name,
        avatar: updates.avatar,
        username: updates.name,
        profileImage: updates.avatar,
      };

      if (accessToken && refreshToken) {
        persistSession({
          user: nextUser,
          accessToken,
          refreshToken,
        });
      }

      return nextUser;
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: !!user && !!accessToken,
      isInitializing,
      completeAuth,
      updateProfile,
      logout,
    }),
    [user, accessToken, refreshToken, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
