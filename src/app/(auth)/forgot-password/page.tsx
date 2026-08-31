"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validators/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    // TODO: call your API to send OTP
    console.log("send reset code to", data.email);
    setSent(true);
    setTimeout(() => {
      router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
    }, 900);
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Forgot password?</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Enter your email and we'll send you a 6-digit code to reset your
          password.
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

        <Button
          type="submit"
          disabled={isSubmitting || sent}
          className="bg-brand-gradient h-11 w-full text-white hover:opacity-90"
        >
          {sent
            ? `Code sent to ${getValues("email")}`
            : isSubmitting
              ? "Sending…"
              : "Send reset code"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-[#64748B]">
        Remembered it?{" "}
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
