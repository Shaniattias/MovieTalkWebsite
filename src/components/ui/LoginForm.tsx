import type { UseFormReturn } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Loader2 } from "lucide-react";

export type LoginFormValues = {
  email: string;
  password: string;
};

type Props = {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (values: LoginFormValues) => void | Promise<void>;
  isLoading: boolean;
};

export function LoginForm({ form, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@email.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="mt-2">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Logging in...
          </span>
        ) : (
          "Login"
        )}
      </Button>
    </form>
  );
}
