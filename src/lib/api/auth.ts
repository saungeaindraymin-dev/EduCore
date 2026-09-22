import { api } from "./client";

export type Role = "admin" | "teacher" | "student";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  signup: (input: {
    name: string;
    email: string;
    password: string;
    role?: Role;
  }) =>
    api<{ token: string; user: User }>("/auth/signup", {
      method: "POST",
      body: input,
      auth: false,
    }),

  forgotPassword: (email: string) =>
    api<{ ok: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),

  verifyOtp: (email: string, code: string) =>
    api<{ ok: boolean }>("/auth/verify-otp", {
      method: "POST",
      body: { email, code },
      auth: false,
    }),

  resetPassword: (email: string, code: string, password: string) =>
    api<{ ok: boolean }>("/auth/reset-password", {
      method: "POST",
      body: { email, code, password },
      auth: false,
    }),

  me: () => api<{ user: User }>("/auth/me"),
};
