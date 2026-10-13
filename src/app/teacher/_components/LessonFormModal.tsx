"use client";

import { useState } from "react";
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
import { lessonsApi, type Lesson } from "@/lib/api/lessons";
import { videoEmbedUrl, videoHost } from "@/lib/video";

const CONTENT_MAX = 50_000;

const schema = z.object({
  title: z.string().trim().min(2, "Use at least 2 characters").max(200),
  content: z
    .string()
    .max(CONTENT_MAX, `Keep it under ${CONTENT_MAX.toLocaleString()} characters`),
  videoUrl: z
    .string()
    .trim()
    .max(500, "Keep the link under 500 characters")
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
      message: "Paste the full link, starting with https://",
    }),
  published: z.boolean(),
});
type Values = z.infer<typeof schema>;

// Mount a fresh instance (via `key`) each time it opens so defaults match `lesson`
export function LessonFormModal({
  open,
  onOpenChange,
  courseId,
  lesson,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  courseId: string;
  lesson?: Lesson | null;
  onSaved: (lesson: Lesson) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: lesson?.title ?? "",
      content: lesson?.content ?? "",
      videoUrl: lesson?.videoUrl ?? "",
      published: lesson?.published ?? false,
    },
  });
  const content = useWatch({ control, name: "content" });
  const videoUrl = useWatch({ control, name: "videoUrl" });
  const trimmedVideo = (videoUrl ?? "").trim();
  const plays = trimmedVideo ? videoEmbedUrl(trimmedVideo) !== null : false;

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    try {
      // An empty link clears the video
      const payload = { ...values, videoUrl: values.videoUrl || null };
      const { data } = lesson
        ? await lessonsApi.update(courseId, lesson.id, payload)
        : await lessonsApi.create(courseId, payload);
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save the lesson");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {lesson ? "Edit lesson" : "Add lesson"}
          </DialogTitle>
          <DialogDescription>
            {lesson
              ? "Update the lesson. Changes to published lessons are visible to students right away."
              : "New lessons are added to the end of the course."}
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
            <Label htmlFor="lesson-title">Title</Label>
            <Input id="lesson-title" {...register("title")} placeholder="Chapter 1: Linear equations" />
            {errors.title && <p className="text-sm text-danger">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-video">
              Video link <span className="font-normal text-sub">(optional)</span>
            </Label>
            <Input
              id="lesson-video"
              type="url"
              inputMode="url"
              {...register("videoUrl")}
              aria-invalid={!!errors.videoUrl}
              placeholder="https://www.youtube.com/watch?v=…"
            />
            {errors.videoUrl ? (
              <p className="text-sm text-danger">{errors.videoUrl.message}</p>
            ) : trimmedVideo ? (
              <p className="text-xs text-sub">
                {plays
                  ? `${videoHost(trimmedVideo)} — it will play inside the lesson.`
                  : `${videoHost(trimmedVideo)} — students will open it in a new tab.`}
              </p>
            ) : (
              <p className="text-xs text-sub">
                YouTube and Vimeo play inside the lesson; other links open in a new tab.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="lesson-content">Content</Label>
              <span className="text-xs text-sub">
                {(content ?? "").length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              id="lesson-content"
              rows={12}
              {...register("content")}
              aria-invalid={!!errors.content}
              placeholder="Explain the topic, add examples, links, and practice questions…"
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 aria-invalid:border-danger"
            />
            {errors.content && <p className="text-sm text-danger">{errors.content.message}</p>}
          </div>

          <label className="flex w-fit cursor-pointer items-start gap-3 rounded-lg border border-border-soft bg-field px-3 py-2.5">
            <input
              type="checkbox"
              {...register("published")}
              className="mt-0.5 h-4 w-4 accent-brand-indigo"
            />
            <span className="text-sm">
              <span className="font-medium text-ink">Published</span>
              <span className="block text-xs text-sub">
                Enrolled students can see this lesson.
              </span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              {isSubmitting ? "Saving…" : lesson ? "Save changes" : "Add lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
