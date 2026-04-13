import api from "./api";

type ApiUser = {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  authProvider?: "local" | "google";
};

function toAbsoluteProfileImage(profileImage?: string): string | undefined {
  if (!profileImage) return undefined;
  if (/^https?:\/\//i.test(profileImage) || profileImage.startsWith("data:")) {
    return profileImage;
  }

  const configuredBase = import.meta.env.VITE_API_URL as string | undefined;
  if (!configuredBase) return profileImage;

  try {
    const origin = new URL(configuredBase).origin;
    return `${origin}${profileImage.startsWith("/") ? "" : "/"}${profileImage}`;
  } catch {
    return profileImage;
  }
}

function mapUser(user: ApiUser) {
  return {
    ...user,
    profileImage: toAbsoluteProfileImage(user.profileImage),
    authProvider: user.authProvider ?? "local",
  };
}

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post("/auth/login", credentials);
    return { success: true, token: response.data.token, user: mapUser(response.data.user as ApiUser) };
  },

  register: async (data: { name: string; email: string; password: string; profileImageFile?: File }) => {
    const formData = new FormData();
    formData.append("username", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    if (data.profileImageFile) {
      formData.append("profileImage", data.profileImageFile);
    }

    const response = await api.post("/auth/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return { success: true, token: response.data.token, user: mapUser(response.data.user as ApiUser) };
  },

  googleLogin: async (accessToken: string) => {
    const response = await api.post("/auth/google", { accessToken });
    return { success: true, token: response.data.token, user: mapUser(response.data.user as ApiUser) };
  },

  updateProfile: async (data: { username?: string; profileImageFile?: File }) => {
    const formData = new FormData();
    if (data.username) formData.append("username", data.username);
    if (data.profileImageFile) formData.append("profileImage", data.profileImageFile);

    const response = await api.patch("/auth/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return { user: mapUser(response.data.user as ApiUser) };
  },

  logout: async () => {
    await api.post("/auth/logout");
  },
};
