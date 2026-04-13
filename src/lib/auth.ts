import api from "./api";

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    return { success: true, token: response.data.token, user: response.data.user };
  },

  oauthLogin: async (provider: "google") => {
    console.log(`Initiating ${provider} OAuth login`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, provider };
  },

  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post("/auth/register", {
      username: data.name,
      email: data.email,
      password: data.password,
    });
    return { success: true, token: response.data.token, user: response.data.user };
  },
};
