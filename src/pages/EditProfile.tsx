import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Save } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../lib/auth";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || user?.username || user?.email?.split("@")[0] || "");
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar || user?.profileImage);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const username = name.trim() || user?.email?.split("@")[0] || "User";
      const response = await authApi.updateProfile({
        username,
        profileImageFile: avatarFile,
      });

      updateProfile({
        name: response.user.username,
        avatar: response.user.profileImage,
      });

      navigate("/profile");
    } catch (err) {
      console.error("Profile update failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative text-white">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.85))]" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Edit Profile</h1>
          </div>

          <button
            onClick={() => navigate("/profile")}
            className="rounded-2xl bg-white/10 border border-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Back
          </button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="h-32 w-32 overflow-hidden rounded-full border border-white/20 bg-white/20 flex items-center justify-center text-4xl font-bold">
              {avatar ? (
                <img src={avatar} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"
              )}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
              <Camera className="h-4 w-4" />
              Change picture
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-8 space-y-2">
            <label htmlFor="username" className="block text-sm text-white/70">
              Username
            </label>
            <input
              id="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your username"
              className="w-full h-12 px-5 rounded-full bg-white/10 text-white placeholder:text-white/55 border border-white/20 backdrop-blur focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
