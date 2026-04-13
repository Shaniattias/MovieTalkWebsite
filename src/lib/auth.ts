import api from "./api";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    return { success: true, token: response.data.token, user: response.data.user };
  },

  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post("/auth/register", {
      username: data.name,
      email: data.email,
      password: data.password,
    });
    return { success: true, token: response.data.token, user: response.data.user };
  },

  googleLogin: async (accessToken: string) => {
    const response = await api.post("/auth/google", { accessToken });
    return { success: true, token: response.data.token, user: response.data.user };
  },

  logout: async () => {
    await api.post("/auth/logout");
  },
};
