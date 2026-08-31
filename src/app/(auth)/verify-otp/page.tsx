"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

const LENGTH = 6;
const RESEND_SECONDS = 30;

function VerifyOtpInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";

  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const setAt = (i: number, val: string) => {
    const next = [...digits];
    next[i] = val;
    setDigits(next);
  };

  const handleChange = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(-1);
    setAt(i, v);
    setError(null);
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LENGTH - 1)
      inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(LENGTH).fill("");
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    inputs.current[Math.min(text.length, LENGTH - 1)]?.focus();
  };

  const code = digits.join("");
  const complete = code.length === LENGTH;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete) return;
    setSubmitting(true);
    // TODO: verify code with API
    console.log("verify", code);
    setTimeout(() => {
      setSubmitting(false);
      router.push(
        `/change-password?email=${encodeURIComponent(email)}&token=demo`,
      );
    }, 700);
  };

  const resend = () => {
    if (cooldown > 0) return;
    // TODO: call resend API
    console.log("resend to", email);
    setCooldown(RESEND_SECONDS);
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Enter the 6-digit code we sent to{" "}
          <span className="font-medium text-[#0F172A]">{email}</span>.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              maxLength={1}
              aria-label={`Digit ${i + 1}`}
              className="font-heading h-14 w-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-center text-2xl font-semibold text-[#0F172A] outline-none transition focus:border-[#6366F1] focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button
          type="submit"
          disabled={!complete || submitting}
          className="bg-brand-gradient h-11 w-full text-white hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Verifying…" : "Verify code"}
        </Button>

        <div className="text-center text-sm text-[#64748B]">
          Didn't receive the code?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="font-semibold text-[#6366F1] hover:underline disabled:text-[#64748B] disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-[#64748B]">
        Wrong email?{" "}
        <Link
          href="/forgot-password"
          className="font-semibold text-[#6366F1] hover:underline"
        >
          Change it
        </Link>
      </p>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpInner />
    </Suspense>
  );
}
