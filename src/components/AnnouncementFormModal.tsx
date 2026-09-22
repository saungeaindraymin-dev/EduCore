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
  ANNOUNCEMENT_AUDIENCES,
  AUDIENCE_LABELS,
  announcementsApi,
  type Announcement,
} from "@/lib/api/announcements";
import { ApiError } from "@/lib/api/client";
import { coursesApi, type Course } from "@/lib/api/courses";
import { toDateTimeLocalInput } from "@/lib/dates";

const BODY_MAX = 10_000;
const PUBLISH_MODES = ["draft", "now", "schedule"] as const;
type PublishMode = (typeof PUBLISH_MODES)[number];

const schema = z
  .object({
    title: z.string().trim().min(3, "Use at least 3 characters").max(200),
    body: z
      .string()
      .trim()
      .min(1, "Write the announcement")
      .max(BODY_MAX, `Keep it under ${BODY_MAX.toLocaleString()} characters`),
    audience: z.enum(ANNOUNCEMENT_AUDIENCES),
    courseId: z.string(),
    publishMode: z.enum(PUBLISH_MODES),
    scheduledFor: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "course" && !v.courseId) {
      ctx.addIssue({ code: "custom", path: ["courseId"], message: "Select a course" });
    }
    if (v.publishMode === "schedule") {
      const when = v.scheduledFor ? new Date(v.scheduledFor) : null;
      if (!when || Number.isNaN(when.getTime())) {
        ctx.addIssue({ code: "custom", path: ["scheduledFor"], message: "Pick a date and time" });
      } else if (when.getTime() <= Date.now()) {
        ctx.addIssue({ code: "custom", path: ["scheduledFor"], message: "Choose a time in the future" });
      }
    }
  });
type Values = z.infer<typeof schema>;

type CourseOption = Pick<Course, "id" | "title" | "code">;

const fieldClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

function initialMode(announcement?: Announcement | null): PublishMode {
  if (!announcement) return "now";
  if (announcement.status === "draft") return "draft";
  return announcement.status === "scheduled" ? "schedule" : "now";
}

// Mount a fresh instance (via `key`) each time it opens so defaults match `announcement`.
// Passing `teacherId` switches to teacher mode: the audience is fixed to "course" and the
// course list holds only that teacher's courses, which is all the API lets them post to.
export function AnnouncementFormModal({
  open,
  onOpenChange,
  announcement,
  onSaved,
  teacherId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  announcement?: Announcement | null;
  onSaved: (announcement: Announcement) => void;
  teacherId?: string;
}) {
  const courseOnly = !!teacherId;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    coursesApi
      .list({ pageSize: 100, ...(teacherId ? { teacherId } : {}) })
      .then((res) => {
        if (cancelled) return;
        setCourses(res.data.filter((c) => c.status !== "inactive"));
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : "Could not load courses");
      });
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey, teacherId]);

  const courseOptions: CourseOption[] = [...courses];
  const currentCourse = announcement?.course;
  if (currentCourse && !courses.some((c) => c.id === currentCourse.id)) {
    courseOptions.unshift(currentCourse);
  }

  const isPublished = announcement?.status === "published";

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: announcement?.title ?? "",
      body: announcement?.body ?? "",
      audience: announcement?.audience ?? (courseOnly ? "course" : "all"),
      courseId: announcement?.course?.id ?? "",
      publishMode: initialMode(announcement),
      scheduledFor:
        announcement?.status === "scheduled" && announcement.publishedAt
          ? toDateTimeLocalInput(new Date(announcement.publishedAt))
          : "",
    },
  });

  const audience = useWatch({ control, name: "audience" });
  const publishMode = useWatch({ control, name: "publishMode" });
  const body = useWatch({ control, name: "body" });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const modeLabel: Record<PublishMode, string> = {
    draft: "Save as draft",
    now: isPublished ? "Published" : "Publish now",
    schedule: "Schedule",
  };

  const submitLabel = isSubmitting
    ? "Saving…"
    : publishMode === "draft"
      ? "Save draft"
      : publishMode === "schedule"
        ? "Schedule"
        : announcement && isPublished
          ? "Save changes"
          : "Publish";

  const submit = async (values: Values) => {
    setServerError(null);
    // Keep the original publish time when editing something already published
    const publishedAt =
      values.publishMode === "draft"
        ? null
        : values.publishMode === "schedule"
          ? new Date(values.scheduledFor).toISOString()
          : isPublished
            ? undefined
            : new Date().toISOString();

    try {
      const { data } = announcement
        ? await announcementsApi.update(announcement.id, {
            title: values.title,
            body: values.body,
            audience: values.audience,
            courseId: values.audience === "course" ? values.courseId : null,
            ...(publishedAt !== undefined && { publishedAt }),
          })
        : await announcementsApi.create({
            title: values.title,
            body: values.body,
            audience: values.audience,
            courseId: values.audience === "course" ? values.courseId : undefined,
            publishedAt: publishedAt ?? null,
          });
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the announcement",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {announcement ? "Edit announcement" : "New announcement"}
          </DialogTitle>
          <DialogDescription>
            {courseOnly
              ? "Post news to the students of a course you teach."
              : "Share news with everyone, a role, or the students and teacher of one course."}
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
            <Input id="title" {...register("title")} placeholder="Midterm schedule" />
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          <div
            className={
              !courseOnly && audience === "course" ? "grid gap-4 sm:grid-cols-2" : undefined
            }
          >
            {courseOnly ? (
              <input type="hidden" {...register("audience")} value="course" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="audience">Audience</Label>
                <select id="audience" {...register("audience")} className={fieldClass}>
                  {ANNOUNCEMENT_AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {a === "course" ? "A specific course" : AUDIENCE_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audience === "course" && (
              <div className="space-y-2">
                <Label htmlFor="courseId">Course</Label>
                <select
                  id="courseId"
                  {...register("courseId")}
                  aria-invalid={!!errors.courseId}
                  className={fieldClass}
                >
                  <option value="">
                    {courseOptions.length
                      ? "Select a course"
                      : courseOnly && !loadError
                        ? "Loading your courses…"
                        : "Loading courses…"}
                  </option>
                  {courseOptions.map((c) => (
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
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="body">Message</Label>
              <span className="text-xs text-sub">
                {(body ?? "").length.toLocaleString()} / {BODY_MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              id="body"
              rows={7}
              {...register("body")}
              aria-invalid={!!errors.body}
              placeholder="What do people need to know?"
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 aria-invalid:border-danger"
            />
            {errors.body && (
              <p className="text-sm text-danger">{errors.body.message}</p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Publishing</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PUBLISH_MODES.map((mode) => (
                <label
                  key={mode}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                    publishMode === mode
                      ? "border-brand-indigo bg-indigo-50 font-medium text-brand-indigo"
                      : "border-border-soft bg-field text-ink hover:border-brand-indigo/40"
                  }`}
                >
                  <input
                    type="radio"
                    value={mode}
                    {...register("publishMode")}
                    className="h-4 w-4 accent-brand-indigo"
                  />
                  {modeLabel[mode]}
                </label>
              ))}
            </div>

            {publishMode === "schedule" && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="scheduledFor">Publish at</Label>
                <input
                  id="scheduledFor"
                  type="datetime-local"
                  {...register("scheduledFor")}
                  aria-invalid={!!errors.scheduledFor}
                  className={`${fieldClass} sm:max-w-xs`}
                />
                <p className="text-xs text-sub">Uses your local time zone.</p>
                {errors.scheduledFor && (
                  <p className="text-sm text-danger">{errors.scheduledFor.message}</p>
                )}
              </div>
            )}
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
