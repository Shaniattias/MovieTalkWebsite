import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const rawApiUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");
const API_BASE_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("movietalk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryableConfig = AxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original: RetryableConfig = error.config;

    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        localStorage.setItem("movietalk_token", data.token);
        if (original.headers) {
          original.headers["Authorization"] = `Bearer ${data.token}`;
        }
        return api(original);
      } catch {
        localStorage.removeItem("movietalk_token");
        localStorage.removeItem("movietalk_user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
