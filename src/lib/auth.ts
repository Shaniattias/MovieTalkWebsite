const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  authProvider: "local" | "google";
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  token?: string;
  user: ApiUser;
};

type ApiError = {
  message?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const errorBody = (await res.json()) as ApiError;
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      message = "Request failed";
    }

    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (data: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: data.name,
        email: data.email,
        password: data.password,
      }),
    }),

  googleLogin: (accessToken: string) =>
    request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};
