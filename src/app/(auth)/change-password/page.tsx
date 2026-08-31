"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validators/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ChangePasswordInner() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { password: "", confirm: "" },
    mode: "onChange",
  });

  const pw = watch("password") ?? "";
  const rules = [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "One number", ok: /[0-9]/.test(pw) },
  ];
  const strength = rules.filter((r) => r.ok).length;

  const onSubmit = async (data: ChangePasswordInput) => {
    console.log("change password", data);
    setSuccess(true);
    setTimeout(() => router.push("/login"), 1200);
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="bg-brand-gradient mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-7 w-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
            />
          </svg>
        </div>
        <h1 className="font-heading mt-6 text-2xl font-bold">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Redirecting you to sign in…
        </p>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Set a new password</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Choose a strong password you don't use anywhere else.
        </p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute inset-y-0 right-3 text-xs font-medium text-[#64748B] hover:text-[#0F172A]"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}

          {/* Strength meter */}
          <div className="mt-2 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < strength ? "bg-brand-gradient" : "bg-[#E2E8F0]"
                }`}
              />
            ))}
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {rules.map((r) => (
              <li
                key={r.label}
                className={r.ok ? "text-[#0F172A]" : "text-[#64748B]"}
              >
                {r.ok ? "✓" : "○"} {r.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="text-sm text-red-600">{errors.confirm.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-gradient h-11 w-full text-white hover:opacity-90"
        >
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-[#64748B]">
        <Link
          href="/login"
          className="font-semibold text-[#6366F1] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordInner />
    </Suspense>
  );
}
