import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, type ApiUser, type AuthResponse } from "../lib/auth";

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
  isInitializing: boolean;
  completeAuth: (payload: AuthResponse) => void;
  updateProfile: (updates: Pick<AuthUser, "name" | "avatar">) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "movietalk_auth";

type StoredAuth = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

function mapUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    profileImage: user.profileImage,
    authProvider: user.authProvider,
    name: user.username,
    avatar: user.profileImage,
  };
}

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

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

  const completeAuth = (payload: AuthResponse) => {
    const nextUser = mapUser(payload.user);
    const nextState: StoredAuth = {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: nextUser,
    };

    setUser(nextUser);
    setAccessToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    persistSession(nextState);
  };

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      const stored = readStoredAuth();
      if (!stored) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const refreshed = await authApi.refresh(stored.refreshToken);
        if (!isMounted) return;
        completeAuth(refreshed);
      } catch {
        if (!isMounted) return;
        clearSession();
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);


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

  const logout = async () => {
    const refresh = refreshToken;
    clearSession();

    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // Ignore logout failures because local session is already cleared.
      }
    }
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
