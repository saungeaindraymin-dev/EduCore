"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { usersApi, type UserSummary } from "@/lib/api/users";
import { useAuthStore } from "@/stores/useAuthStore";

const ROLES = ["student", "teacher", "admin"] as const;
const STATUSES = ["active", "pending", "inactive"] as const;

const selectClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm capitalize text-ink focus:border-brand-indigo focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

function buildSchema(isEdit: boolean) {
  return z
    .object({
      name: z.string().trim().min(2, "Name is required").max(120),
      email: z.string().trim().email("Enter a valid email").max(255),
      role: z.enum(ROLES).optional(),
      status: z.enum(STATUSES).optional(),
      password: z.string().max(128, "Keep it under 128 characters"),
      confirmPassword: z.string(),
    })
    .superRefine((v, ctx) => {
      // When editing, a blank password keeps the current one
      const needsPassword = !isEdit || v.password.length > 0;
      if (needsPassword && v.password.length < 8) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: "Use at least 8 characters",
        });
      }
      if (v.password !== v.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords don't match",
        });
      }
    });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

// Mount a fresh instance (via `key`) each time it opens so defaults match `user`
export function UserFormModal({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: UserSummary | null;
  onSaved: (user: UserSummary) => void;
}) {
  const isEdit = !!user;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isSelf = !!user && user.id === currentUserId;

  const schema = useMemo(() => buildSchema(isEdit), [isEdit]);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "student",
      status: user?.status ?? "active",
      password: "",
      confirmPassword: "",
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    try {
      const { data } = user
        ? await usersApi.update(user.id, {
            name: values.name,
            email: values.email,
            ...(isSelf ? {} : { role: values.role, status: values.status }),
            ...(values.password ? { password: values.password } : {}),
          })
        : await usersApi.create({
            name: values.name,
            email: values.email,
            password: values.password,
            role: values.role ?? "student",
            status: values.status ?? "active",
          });
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && /email/i.test(err.message)) {
        setError("email", { message: err.message });
        return;
      }
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the user",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {user ? "Edit user" : "Add new user"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Update their details. Leave the password fields blank to keep the current password."
              : "Create their account and set a password. Share it with them securely."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...register("name")} placeholder="Jane Doe" />
            {errors.name && (
              <p className="text-sm text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              {...register("email")}
              placeholder="jane@educore.app"
            />
            {errors.email && (
              <p className="text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                {...register("role", { disabled: isSelf })}
                className={selectClass}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status", { disabled: isSelf })}
                className={selectClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isSelf && (
            <p className="-mt-2 text-xs text-sub">
              You can&apos;t change your own role or status.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">
                {user ? "New password" : "Password"}
              </Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("password")}
                placeholder={user ? "Leave blank to keep" : "At least 8 characters"}
              />
              {errors.password && (
                <p className="text-sm text-danger">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-danger">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex w-fit items-center gap-2 text-sm text-sub">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="h-4 w-4 accent-brand-indigo"
            />
            Show passwords
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              {isSubmitting
                ? "Saving…"
                : user
                  ? "Save changes"
                  : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
