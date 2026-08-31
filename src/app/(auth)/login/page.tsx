"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const onSubmit = async (data: LoginInput) => {
    // TODO: call your auth API
    console.log("login", data);
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Sign in to continue to your EduCore account.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@school.edu"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#6366F1] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={!!watch("remember")}
            onCheckedChange={(v) => setValue("remember", Boolean(v))}
          />
          <Label
            htmlFor="remember"
            className="text-sm font-normal text-[#64748B]"
          >
            Remember me for 30 days
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-gradient h-11 w-full text-white hover:opacity-90"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-[#64748B]">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#6366F1] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
