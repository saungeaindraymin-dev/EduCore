import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d+$/, "Numbers only"),
});
export type OtpInput = z.infer<typeof otpSchema>;

export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[a-z]/, "One lowercase letter")
      .regex(/[0-9]/, "One number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
