import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";

import { GoogleButton } from "../components/ui/GoogleButton";
import { LoginForm } from "../components/ui/LoginForm";
import { authApi } from "../lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login(data);
      if (result.success) {
        navigate("/register"); // תשני בהמשך לדף הבית
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await authApi.oauthLogin("google");
      console.log("Google OAuth initiated!");
    } catch {
      setError("Failed to connect with Google. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/movie-collage-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img
              src="/images/logo.png"
              alt="MovieTalk Logo"
              className="w-16 h-16"
            />
            <h1 className="text-3xl font-bold text-foreground mt-4">
              MovieTalk
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm text-center"
            >
              {error}
            </div>
          )}

          <LoginForm form={form} onSubmit={onSubmit} isLoading={isLoading} />

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="flex justify-center">
            <GoogleButton
              onClick={handleGoogleLogin}
              isLoading={isGoogleLoading}
            />
          </div>

          <div className="text-center mt-6">
            <Link
              to="/register"
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              New to MovieTalk? Sign up now.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
