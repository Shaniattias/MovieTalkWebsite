import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";



import { GoogleButton } from "../components/ui/GoogleButton";
import { authApi } from "../lib/auth";
import { useAuth } from "../context/AuthContext";


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
    const { loginMock } = useAuth();


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const inputClass =
    "w-full h-12 px-5 rounded-full bg-white/10 text-white placeholder:text-white/55 " +
    "border border-white/20 backdrop-blur focus:outline-none focus:ring-1 focus:ring-red-500/50";

  const labelClass = "block text-sm text-white/70 mb-2";
  const errClass = "mt-2 text-xs text-red-200";

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authApi.login({ email: data.email, password: data.password });
      loginMock(result.user.email, result.user.username, undefined, result.token);
      navigate("/home");
    } catch {
      setError("Invalid email or password.");
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
        <div className="absolute inset-0 bg-black/75" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="backdrop-blur-2xl bg-white/10 border border-white/15 rounded-3xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">

          <div className="flex flex-col items-center mb-6">
            <img
              src="/images/logo.png"
              alt="MovieTalk Logo"
              className="w-12 h-12"
            />
            <h1 className="text-3xl font-bold text-white/90 mt-4">
              MovieTalk
            </h1>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-4 p-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-lg text-center"
            >
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className={labelClass}>Email</label>
              <input
                className={inputClass}
                type="email"
                placeholder="name@email.com"
                autoComplete="email"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className={errClass}>{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <input
                className={inputClass}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className={errClass}>
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-red-600 hover:bg-red-800 transition text-white font-semibold disabled:opacity-60"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>


        
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-white/50 text-xs uppercase">or</span>
            <div className="flex-1 h-px bg-white/15" />
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
