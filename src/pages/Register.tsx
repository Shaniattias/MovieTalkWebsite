import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { GoogleButton } from "../components/ui/GoogleButton";
import { authApi } from "../lib/auth";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      if (result.success) navigate("/login");
      else setError("Registration failed. Please try again.");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await authApi.oauthLogin("google");
    } catch {
      setError("Failed to connect with Google.");
    } finally {
      setIsGoogleLoading(false);
    }
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
              className="w-12 h-12 opacity-90"
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                placeholder="Your name"
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

            <div>
              <label className={labelClass}>Confirm Password</label>
              <input
                className={inputClass}
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className={errClass}>{errors.confirmPassword.message}</p>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-white/65">
              <input
                type="checkbox"
                className="h-4 w-4 accent-red-500"
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
              className="w-full h-12 rounded-full bg-red-500 hover:bg-red-600 transition text-white font-semibold disabled:opacity-60"
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
            <Link to="/login" className="text-red-300 hover:text-red-200 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
