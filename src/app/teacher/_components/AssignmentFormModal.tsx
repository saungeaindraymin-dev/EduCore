"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  assignmentsApi,
  type Assignment,
} from "@/lib/api/assignments";
import { ApiError } from "@/lib/api/client";
import { coursesApi, type Course } from "@/lib/api/courses";
import { toDateTimeLocalInput } from "@/lib/dates";

const DESCRIPTION_MAX = 20_000;

const schema = z
  .object({
    title: z.string().trim().min(3, "Use at least 3 characters").max(200),
    description: z
      .string()
      .max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX.toLocaleString()} characters`),
    courseId: z.string().min(1, "Select a course"),
    totalPoints: z
      .number({ error: "Enter a number of points" })
      .int("Use a whole number")
      .min(1, "At least 1 point")
      .max(1000, "At most 1000 points"),
    status: z.enum(ASSIGNMENT_STATUSES),
    hasDueDate: z.boolean(),
    dueAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.hasDueDate) return;
    const when = v.dueAt ? new Date(v.dueAt) : null;
    if (!when || Number.isNaN(when.getTime())) {
      ctx.addIssue({ code: "custom", path: ["dueAt"], message: "Pick a date and time" });
    }
  });
type Values = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

/**
 * Teachers only: an assignment always belongs to a course they teach, which is why the course
 * list here is their own. Mount a fresh instance (via `key`) each time it opens.
 */
export function AssignmentFormModal({
  open,
  onOpenChange,
  assignment,
  teacherId,
  defaultCourseId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assignment?: Assignment | null;
  teacherId: string;
  defaultCourseId?: string;
  onSaved: (assignment: Assignment) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    coursesApi
      .list({ teacherId, pageSize: 100 })
      .then((res) => {
        if (cancelled) return;
        setCourses(res.data.filter((c) => c.status !== "inactive"));
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not load your courses");
      });
    return () => {
      cancelled = true;
    };
  }, [open, teacherId, reloadKey]);

  // Keep the current course selectable before the list loads
  const options: { id: string; title: string; code: string }[] = [...courses];
  if (assignment && !courses.some((c) => c.id === assignment.course.id)) {
    options.unshift(assignment.course);
  }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: assignment?.title ?? "",
      description: assignment?.description ?? "",
      courseId: assignment?.course.id ?? defaultCourseId ?? "",
      totalPoints: assignment?.totalPoints ?? 100,
      status: assignment?.status ?? "draft",
      hasDueDate: !!assignment?.dueAt,
      dueAt: assignment?.dueAt ? toDateTimeLocalInput(new Date(assignment.dueAt)) : "",
    },
  });

  const description = useWatch({ control, name: "description" });
  const hasDueDate = useWatch({ control, name: "hasDueDate" });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    const payload = {
      title: values.title,
      description: values.description.trim(),
      totalPoints: values.totalPoints,
      status: values.status,
      dueAt: values.hasDueDate ? new Date(values.dueAt).toISOString() : null,
    };
    try {
      const { data } = assignment
        ? await assignmentsApi.update(assignment.id, payload)
        : await assignmentsApi.create(values.courseId, payload);
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the assignment",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {assignment ? "Edit assignment" : "New assignment"}
          </DialogTitle>
          <DialogDescription>
            Set work for a course you teach. Students see it once it&apos;s published.
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
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Homework 1" />
            {errors.title && <p className="text-sm text-danger">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courseId">Course</Label>
              <select
                id="courseId"
                {...register("courseId")}
                disabled={!!assignment}
                aria-invalid={!!errors.courseId}
                className={`${fieldClass} disabled:opacity-60`}
              >
                <option value="">
                  {options.length ? "Select a course" : "Loading your courses…"}
                </option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.code}
                  </option>
                ))}
              </select>
              {assignment && (
                <p className="text-xs text-sub">
                  An assignment stays with its course.
                </p>
              )}
              {loadError && (
                <p role="alert" className="text-sm text-danger">
                  {loadError}.{" "}
                  <button
                    type="button"
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="font-medium underline"
                  >
                    Retry
                  </button>
                </p>
              )}
              {errors.courseId && (
                <p className="text-sm text-danger">{errors.courseId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPoints">Points</Label>
              <Input
                id="totalPoints"
                type="number"
                min={1}
                max={1000}
                {...register("totalPoints", { valueAsNumber: true })}
                aria-invalid={!!errors.totalPoints}
              />
              {errors.totalPoints && (
                <p className="text-sm text-danger">{errors.totalPoints.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description">Instructions</Label>
              <span className="text-xs text-sub">
                {(description ?? "").length.toLocaleString()} /{" "}
                {DESCRIPTION_MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              id="description"
              rows={6}
              {...register("description")}
              aria-invalid={!!errors.description}
              placeholder="What should students hand in?"
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 aria-invalid:border-danger"
            />
            {errors.description && (
              <p className="text-sm text-danger">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" {...register("status")} className={fieldClass}>
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ASSIGNMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-sub">
                Draft is private. Closed stays readable but is over.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueAt">Deadline</Label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  {...register("hasDueDate")}
                  className="h-4 w-4 accent-brand-indigo"
                />
                Set a due date
              </label>
              {hasDueDate && (
                <>
                  <input
                    id="dueAt"
                    type="datetime-local"
                    {...register("dueAt")}
                    aria-invalid={!!errors.dueAt}
                    className={fieldClass}
                  />
                  <p className="text-xs text-sub">Uses your local time zone.</p>
                  {errors.dueAt && (
                    <p className="text-sm text-danger">{errors.dueAt.message}</p>
                  )}
                </>
              )}
            </div>
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
              {isSubmitting ? "Saving…" : assignment ? "Save changes" : "Create assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
