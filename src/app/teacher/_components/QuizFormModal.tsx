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
import { ApiError } from "@/lib/api/client";
import { coursesApi, type Course } from "@/lib/api/courses";
import { QUIZ_STATUSES, quizzesApi, type Quiz } from "@/lib/api/quizzes";
import { toDateTimeLocalInput } from "@/lib/dates";

const schema = z
  .object({
    title: z.string().trim().min(3, "Use at least 3 characters").max(200),
    description: z.string().max(10_000, "Keep it under 10,000 characters"),
    courseId: z.string().min(1, "Select a course"),
    status: z.enum(QUIZ_STATUSES),
    attemptsAllowed: z
      .number({ error: "Enter a number of attempts" })
      .int("Use a whole number")
      .min(1, "At least 1 attempt")
      .max(10, "At most 10 attempts"),
    hasTimeLimit: z.boolean(),
    timeLimitMinutes: z.union([z.number(), z.nan()]),
    hasDueDate: z.boolean(),
    dueAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.hasTimeLimit) {
      const minutes = v.timeLimitMinutes;
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
        ctx.addIssue({
          code: "custom",
          path: ["timeLimitMinutes"],
          message: "Between 1 and 600 minutes",
        });
      }
    }
    if (v.hasDueDate) {
      const when = v.dueAt ? new Date(v.dueAt) : null;
      if (!when || Number.isNaN(when.getTime())) {
        ctx.addIssue({ code: "custom", path: ["dueAt"], message: "Pick a date and time" });
      }
    }
  });
type Values = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

/** Quiz settings. The questions (and the marking key) are edited on the quiz's own page. */
export function QuizFormModal({
  open,
  onOpenChange,
  quiz,
  teacherId,
  defaultCourseId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quiz?: Quiz | null;
  teacherId: string;
  defaultCourseId?: string;
  onSaved: (quiz: Quiz) => void;
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

  const options: { id: string; title: string; code: string }[] = [...courses];
  if (quiz && !courses.some((c) => c.id === quiz.course.id)) options.unshift(quiz.course);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: quiz?.title ?? "",
      description: quiz?.description ?? "",
      courseId: quiz?.course.id ?? defaultCourseId ?? "",
      status: quiz?.status ?? "draft",
      attemptsAllowed: quiz?.attemptsAllowed ?? 1,
      hasTimeLimit: !!quiz?.timeLimitMinutes,
      timeLimitMinutes: quiz?.timeLimitMinutes ?? 15,
      hasDueDate: !!quiz?.dueAt,
      dueAt: quiz?.dueAt ? toDateTimeLocalInput(new Date(quiz.dueAt)) : "",
    },
  });

  const hasTimeLimit = useWatch({ control, name: "hasTimeLimit" });
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
      status: values.status,
      attemptsAllowed: values.attemptsAllowed,
      timeLimitMinutes: values.hasTimeLimit ? values.timeLimitMinutes : null,
      dueAt: values.hasDueDate ? new Date(values.dueAt).toISOString() : null,
    };
    try {
      const { data } = quiz
        ? await quizzesApi.update(quiz.id, payload)
        : await quizzesApi.create(values.courseId, payload);
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save the quiz");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {quiz ? "Quiz settings" : "New quiz"}
          </DialogTitle>
          <DialogDescription>
            {quiz
              ? "Change how the quiz runs. Questions live on the quiz's own page."
              : "Set it up first — you'll add the questions next."}
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
            <Input id="title" {...register("title")} placeholder="Unit 1 quiz" />
            {errors.title && <p className="text-sm text-danger">{errors.title.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courseId">Course</Label>
              <select
                id="courseId"
                {...register("courseId")}
                disabled={!!quiz}
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
              <Label htmlFor="attemptsAllowed">Attempts allowed</Label>
              <Input
                id="attemptsAllowed"
                type="number"
                min={1}
                max={10}
                {...register("attemptsAllowed", { valueAsNumber: true })}
                aria-invalid={!!errors.attemptsAllowed}
              />
              {errors.attemptsAllowed && (
                <p className="text-sm text-danger">{errors.attemptsAllowed.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Instructions</Label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              placeholder="Anything students should know before they start."
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
            />
            {errors.description && (
              <p className="text-sm text-danger">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" {...register("status")} className={`${fieldClass} capitalize`}>
                {QUIZ_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
              <p className="text-xs text-sub">
                A quiz needs at least one question before it can be published.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    {...register("hasTimeLimit")}
                    className="h-4 w-4 accent-brand-indigo"
                  />
                  Time limit
                </label>
                {hasTimeLimit && (
                  <>
                    <Input
                      type="number"
                      min={1}
                      max={600}
                      aria-label="Minutes"
                      {...register("timeLimitMinutes", { valueAsNumber: true })}
                      aria-invalid={!!errors.timeLimitMinutes}
                    />
                    {errors.timeLimitMinutes && (
                      <p className="text-sm text-danger">
                        {errors.timeLimitMinutes.message}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    {...register("hasDueDate")}
                    className="h-4 w-4 accent-brand-indigo"
                  />
                  Deadline
                </label>
                {hasDueDate && (
                  <>
                    <input
                      type="datetime-local"
                      aria-label="Due at"
                      {...register("dueAt")}
                      aria-invalid={!!errors.dueAt}
                      className={fieldClass}
                    />
                    {errors.dueAt && (
                      <p className="text-sm text-danger">{errors.dueAt.message}</p>
                    )}
                  </>
                )}
              </div>
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
              {isSubmitting ? "Saving…" : quiz ? "Save settings" : "Create quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
