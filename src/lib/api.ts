import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const rawApiUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, "");
export const API_BASE_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;
export const API_ORIGIN = new URL(API_BASE_URL).origin;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("movietalk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

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

/**
 * Converts a server-relative media path (e.g. /uploads/post-images/file.jpg)
 * to an absolute URL using the configured backend origin.
 * Already-absolute URLs and data: URIs are returned unchanged.
 * Set VITE_API_URL to the backend origin for both dev and production.
 */
export function resolveMediaUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }
  const prefix = pathOrUrl.startsWith("/") ? "" : "/";
  return `${API_ORIGIN}${prefix}${pathOrUrl}`;
}

export default api;
