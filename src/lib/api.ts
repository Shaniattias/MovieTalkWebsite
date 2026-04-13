import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
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
          `${API_URL}/api/auth/refresh`,
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
