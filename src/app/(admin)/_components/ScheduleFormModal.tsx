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
import { scheduleApi, type ScheduleEvent } from "@/lib/api/schedule";
import { usersApi, type UserSummary } from "@/lib/api/users";
import { fromDateTimeInputs, toDateInput, toTimeInput } from "@/lib/dates";

const schema = z
  .object({
    courseId: z.string().min(1, "Select a course"),
    teacherId: z.string(), // "" = the course's teacher
    title: z.string().trim().max(200, "Keep it under 200 characters"),
    date: z.string().min(1, "Pick a date"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().trim().max(120, "Keep it under 120 characters"),
    repeatWeeks: z
      .number({ error: "Enter a number of weeks" })
      .int()
      .min(1, "At least 1 week")
      .max(26, "Up to 26 weeks"),
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "End must be after start",
  });
type Values = z.infer<typeof schema>;

type LoadStatus = "loading" | "ready" | "error";
type CourseOption = Pick<Course, "id" | "title" | "code"> & {
  teacher?: Course["teacher"];
};
type TeacherOption = Pick<UserSummary, "id" | "name">;

const fieldClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

// Mount a fresh instance (via `key`) each time it opens so defaults match `event`
export function ScheduleFormModal({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSaved,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event?: ScheduleEvent | null;
  defaultDate?: Date | null;
  onSaved: (event: ScheduleEvent) => void;
  onDelete?: (event: ScheduleEvent) => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<UserSummary[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      coursesApi.list({ pageSize: 100 }),
      usersApi.list({ role: "teacher", status: "active", pageSize: 100 }),
    ])
      .then(([coursesRes, teachersRes]) => {
        if (cancelled) return;
        setCourses(coursesRes.data.filter((c) => c.status !== "inactive"));
        setTeachers(teachersRes.data);
        setLoadStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load options",
        );
        setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  // Keep the event's current course/teacher selectable before lists load
  const courseOptions: CourseOption[] = [...courses];
  if (event && !courses.some((c) => c.id === event.course.id)) {
    courseOptions.unshift(event.course);
  }
  const teacherOptions: TeacherOption[] = [...teachers];
  const currentTeacher = event?.teacher;
  if (currentTeacher && !teachers.some((t) => t.id === currentTeacher.id)) {
    teacherOptions.unshift(currentTeacher);
  }

  const start = event ? new Date(event.start) : null;
  const end = event ? new Date(event.end) : null;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      courseId: event?.course.id ?? "",
      teacherId: event?.teacher?.id ?? "",
      title: event?.title ?? "",
      date: toDateInput(start ?? defaultDate ?? new Date()),
      startTime: start ? toTimeInput(start) : "09:00",
      endTime: end ? toTimeInput(end) : "10:00",
      location: event?.location ?? "",
      repeatWeeks: 1,
    },
  });

  const selectedCourseId = useWatch({ control, name: "courseId" });
  const selectedCourse = courseOptions.find((c) => c.id === selectedCourseId);
  const courseTeacherName = selectedCourse?.teacher?.name;

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    const startIso = fromDateTimeInputs(values.date, values.startTime);
    const endIso = fromDateTimeInputs(values.date, values.endTime);
    try {
      if (event) {
        const { data } = await scheduleApi.update(event.id, {
          courseId: values.courseId,
          teacherId: values.teacherId || null,
          title: values.title || selectedCourse?.title,
          start: startIso,
          end: endIso,
          location: values.location || null,
        });
        onSaved(data);
      } else {
        const { data } = await scheduleApi.create({
          courseId: values.courseId,
          teacherId: values.teacherId || undefined,
          title: values.title || undefined,
          start: startIso,
          end: endIso,
          location: values.location || undefined,
          repeatWeeks: values.repeatWeeks,
        });
        onSaved(data[0]);
      }
      handleOpenChange(false);
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the class",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {event ? "Edit class" : "Schedule a class"}
          </DialogTitle>
          <DialogDescription>
            {event
              ? "Update this class, or delete it from the timetable."
              : "Add a class to the timetable. Times use your local time zone."}
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

          <div className="space-y-2">
            <Label htmlFor="courseId">Course</Label>
            <select
              id="courseId"
              {...register("courseId")}
              aria-invalid={!!errors.courseId}
              className={fieldClass}
            >
              <option value="">
                {loadStatus === "loading" && courseOptions.length === 0
                  ? "Loading courses…"
                  : courseOptions.length
                    ? "Select a course"
                    : "No courses available"}
              </option>
              {courseOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} — {c.code}
                </option>
              ))}
            </select>
            {errors.courseId && (
              <p className="text-sm text-danger">{errors.courseId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="font-normal text-sub">(optional)</span>
            </Label>
            <Input
              id="title"
              {...register("title")}
              placeholder={selectedCourse?.title ?? "Defaults to the course title"}
            />
            {errors.title && (
              <p className="text-sm text-danger">{errors.title.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <input
                id="date"
                type="date"
                {...register("date")}
                aria-invalid={!!errors.date}
                className={fieldClass}
              />
              {errors.date && (
                <p className="text-sm text-danger">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Starts</Label>
              <input
                id="startTime"
                type="time"
                {...register("startTime")}
                aria-invalid={!!errors.startTime}
                className={fieldClass}
              />
              {errors.startTime && (
                <p className="text-sm text-danger">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Ends</Label>
              <input
                id="endTime"
                type="time"
                {...register("endTime")}
                aria-invalid={!!errors.endTime}
                className={fieldClass}
              />
              {errors.endTime && (
                <p className="text-sm text-danger">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teacherId">Teacher</Label>
              <select
                id="teacherId"
                {...register("teacherId")}
                className={fieldClass}
              >
                <option value="">
                  {courseTeacherName
                    ? `Course teacher (${courseTeacherName})`
                    : "Course teacher"}
                </option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">
                Location <span className="font-normal text-sub">(optional)</span>
              </Label>
              <Input
                id="location"
                {...register("location")}
                placeholder="Room 204 or a meeting link"
              />
              {errors.location && (
                <p className="text-sm text-danger">{errors.location.message}</p>
              )}
            </div>
          </div>

          {!event && (
            <div className="space-y-2">
              <Label htmlFor="repeatWeeks">Repeat weekly</Label>
              <div className="flex items-center gap-3">
                <input
                  id="repeatWeeks"
                  type="number"
                  min={1}
                  max={26}
                  {...register("repeatWeeks", { valueAsNumber: true })}
                  aria-invalid={!!errors.repeatWeeks}
                  className={`${fieldClass} w-24`}
                />
                <span className="text-sm text-sub">
                  week(s) — creates one class per week from the date above
                </span>
              </div>
              {errors.repeatWeeks && (
                <p className="text-sm text-danger">
                  {errors.repeatWeeks.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {event && onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete(event)}
                className="border-danger/30 text-danger hover:bg-danger-bg sm:mr-auto"
              >
                Delete
              </Button>
            )}
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
                : event
                  ? "Save changes"
                  : "Schedule class"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
