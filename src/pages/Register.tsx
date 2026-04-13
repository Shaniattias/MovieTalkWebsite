import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { GoogleButton } from "../components/ui/GoogleButton";
import { authApi } from "../lib/auth";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "You must accept the terms and conditions",
  }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { completeAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const session = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        profileImageFile: avatarFile,
      });
      completeAuth(session);
      navigate("/home");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signupWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const session = await authApi.googleLogin(tokenResponse.access_token);
        completeAuth(session);
        navigate("/home");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect with Google.");
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      setError("Google signup failed. Please try again.");
      setIsGoogleLoading(false);
    },
    onNonOAuthError: (err) => {
      if (err.type !== "popup_closed") {
        setError("Google signup was cancelled or failed.");
      }
      setIsGoogleLoading(false);
    },
  });

  const handleGoogleSignup = () => {
    setError(null);
    setIsGoogleLoading(true);
    signupWithGoogle();
  };

  const inputClass =
    "w-full h-12 px-5 rounded-full bg-white/10 text-white placeholder:text-white/55 " +
    "border border-white/20 backdrop-blur focus:outline-none focus:ring-1 focus:ring-red-500/50";

  const labelClass = "block text-sm text-white/70 mb-2";
  const errClass = "mt-2 text-xs text-red-200";

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      {/* Background — SAME AS LOGIN */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* CARD — EXACT SAME SIZE AS LOGIN */}
      <div className="relative z-10 w-full max-w-sm">
        <div className="backdrop-blur-2xl bg-white/10 border border-white/15 rounded-3xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/images/logo.png"
              alt="MovieTalk Logo"
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold text-white/90 mt-4">
              Join MovieTalk
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-20 w-20 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15 transition group"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar preview" className="h-full w-full object-cover" />
              ) : (
                <Camera className="h-7 w-7 text-white/50 group-hover:text-white/80 transition" />
              )}
              <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition">
                <span className="text-[10px] text-white/80 bg-black/40 px-1.5 py-0.5 rounded-full">
                  {avatar ? "Change" : "Add photo"}
                </span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelClass}>Username</label>
              <input
                className={inputClass}
                placeholder="username"
                {...register("name")}
              />
              {errors.name && <p className={errClass}>{errors.name.message}</p>}
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                placeholder="name@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className={errClass}>{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                className={inputClass}
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className={errClass}>{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-white/65">
              <input
                type="checkbox"
                className="h-4 w-4 accent-red-600"
                {...register("acceptTerms")}
              />
              I accept the terms and conditions
            </label>
            {errors.acceptTerms && (
              <p className={errClass}>{errors.acceptTerms.message}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-red-600 hover:bg-red-800 transition text-white font-semibold disabled:opacity-60"
            >
              {isLoading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-white/50 text-xs uppercase">or</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>

          <div className="flex justify-center">
            <GoogleButton onClick={handleGoogleSignup} isLoading={isGoogleLoading} />
          </div>

          <div className="text-center mt-6 text-sm">
            <span className="text-white/60">Already have an account? </span>
            <Link to="/login" className="text-red-600 hover:text-red-800 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
