"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  COURSE_CATEGORIES,
  COURSE_STATUSES,
  coursesApi,
  type Course,
} from "@/lib/api/courses";
import { usersApi, type UserSummary } from "@/lib/api/users";

function buildSchema(assignTeacher: boolean) {
  return z
    .object({
      title: z.string().trim().min(3, "Title is required").max(200),
      code: z.string().trim().min(2, "Course code is required").max(30),
      teacherId: z.string(),
      category: z.enum(COURSE_CATEGORIES),
      status: z.enum(COURSE_STATUSES),
      description: z.string().max(2000, "Keep it under 2000 characters"),
    })
    .superRefine((v, ctx) => {
      if (assignTeacher && !v.teacherId) {
        ctx.addIssue({ code: "custom", path: ["teacherId"], message: "Select a teacher" });
      }
    });
}
type Values = z.infer<ReturnType<typeof buildSchema>>;

type LoadStatus = "loading" | "ready" | "error";
type TeacherOption = { id: string; name: string; email?: string };

const selectClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

// Mount a fresh instance (via `key`) each time it opens so defaults match `course`.
// assignTeacher=false is for teachers editing a course they're assigned: the teacher field is
// hidden and the admin-only teacher list isn't loaded. Only admins create courses, so that
// mode is always passed an existing `course`.
export function CourseFormModal({
  open,
  onOpenChange,
  course,
  onSaved,
  assignTeacher = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  course?: Course | null;
  onSaved: (course: Course) => void;
  assignTeacher?: boolean;
}) {
  const [teachers, setTeachers] = useState<UserSummary[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch users with the teacher role each time the modal opens
  useEffect(() => {
    if (!open || !assignTeacher) return;
    let cancelled = false;
    usersApi
      .list({ role: "teacher", pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        setTeachers(res.data);
        setLoadStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load teachers",
        );
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, assignTeacher, reloadKey]);

  // Keep the course's current teacher selectable before the list loads (or if it's missing from it)
  const options: TeacherOption[] = [...teachers];
  const currentTeacher = course?.teacher;
  if (currentTeacher && !teachers.some((t) => t.id === currentTeacher.id)) {
    options.unshift(currentTeacher);
  }

  const schema = useMemo(() => buildSchema(assignTeacher), [assignTeacher]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: course?.title ?? "",
      code: course?.code ?? "",
      teacherId: course?.teacher?.id ?? "",
      category: course?.category ?? "Mathematics",
      status: course?.status ?? "draft",
      description: course?.description ?? "",
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    const description = values.description.trim();
    const shared = {
      title: values.title,
      code: values.code,
      category: values.category,
      ...(assignTeacher && { teacherId: values.teacherId }),
    };
    try {
      const { data } = course
        ? await coursesApi.update(course.id, {
            ...shared,
            status: values.status,
            description: description || null,
          })
        : await coursesApi.create({
            ...shared,
            teacherId: values.teacherId,
            description: description || undefined,
          });
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("code", { message: err.message });
        return;
      }
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the course",
      );
    }
  };

  const teacherPlaceholder =
    loadStatus === "loading" && options.length === 0
      ? "Loading teachers…"
      : loadStatus === "ready" && options.length === 0
        ? "No teachers available"
        : "Select a teacher";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {course ? "Edit course" : "Create new course"}
          </DialogTitle>
          <DialogDescription>
            {course
              ? "Update the course details and status."
              : "Set the basics — you can add lessons and materials after creating."}
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
            <Label htmlFor="title">Course title</Label>
            <Input id="title" {...register("title")} placeholder="Advanced Algebra" />
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Course code</Label>
              <Input id="code" {...register("code")} placeholder="MATH-201" />
              {errors.code && (
                <p className="text-sm text-danger">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select id="category" {...register("category")} className={selectClass}>
                {COURSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(assignTeacher || course) && (
            <div className={assignTeacher && course ? "grid gap-4 sm:grid-cols-2" : undefined}>
              {assignTeacher && (
                <div className="space-y-2">
                  <Label htmlFor="teacherId">Assigned teacher</Label>
                  <select
                    id="teacherId"
                    {...register("teacherId")}
                    aria-invalid={!!errors.teacherId}
                    aria-describedby={errors.teacherId ? "teacherId-error" : undefined}
                    className={selectClass}
                  >
                    <option value="">{teacherPlaceholder}</option>
                    {options.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.email ? `${t.name} (${t.email})` : t.name}
                      </option>
                    ))}
                  </select>

                  {loadStatus === "error" && (
                    <p role="alert" className="text-sm text-danger">
                      {loadError}.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setLoadStatus("loading");
                          setReloadKey((k) => k + 1);
                        }}
                        className="font-medium underline"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                  {loadStatus === "ready" && teachers.length === 0 && (
                    <p className="text-xs text-sub">
                      No users have the teacher role yet. Add one from User
                      Management first.
                    </p>
                  )}
                  {errors.teacherId && (
                    <p id="teacherId-error" className="text-sm text-danger">
                      {errors.teacherId.message}
                    </p>
                  )}
                </div>
              )}

              {course && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    {...register("status")}
                    className={`${selectClass} capitalize`}
                  >
                    {COURSE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="font-normal text-sub">(optional)</span>
            </Label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="What will students learn?"
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
            />
            {errors.description && (
              <p className="text-sm text-danger">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              {isSubmitting ? "Saving…" : course ? "Save changes" : "Create course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
