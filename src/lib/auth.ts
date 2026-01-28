export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Login attempt with:", credentials.email);
    return { success: true, user: { email: credentials.email } };
  },

  oauthLogin: async (provider: "google") => {
    console.log(`Initiating ${provider} OAuth login`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, provider };
  },

  register: async (data: { name: string; email: string; password: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Registration attempt with:", data.email);
    return { success: true, user: { name: data.name, email: data.email } };
  },
};
