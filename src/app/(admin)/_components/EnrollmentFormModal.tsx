"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { coursesApi, type Course } from "@/lib/api/courses";
import {
  ENROLLMENT_STATUSES,
  enrollmentsApi,
  type Enrollment,
} from "@/lib/api/enrollments";
import { usersApi, type UserSummary } from "@/lib/api/users";

const schema = z.object({
  studentId: z.string().min(1, "Select a student"),
  courseId: z.string().min(1, "Select a course"),
  status: z.enum(ENROLLMENT_STATUSES),
});
type Values = z.infer<typeof schema>;

type LoadStatus = "loading" | "ready" | "error";
type CourseOption = Pick<Course, "id" | "title" | "code" | "status">;

const selectClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

// Mount a fresh instance (via `key`) each time it opens so defaults match `enrollment`
export function EnrollmentFormModal({
  open,
  onOpenChange,
  enrollment,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  enrollment?: Enrollment | null;
  onSaved: (enrollment: Enrollment) => void;
}) {
  const isEdit = !!enrollment;
  const [students, setStudents] = useState<UserSummary[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // Options: active students (only needed when creating) and courses that aren't inactive
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      isEdit
        ? Promise.resolve(null)
        : usersApi.list({ role: "student", status: "active", pageSize: 100 }),
      coursesApi.list({ pageSize: 100 }),
    ])
      .then(([studentsRes, coursesRes]) => {
        if (cancelled) return;
        if (studentsRes) setStudents(studentsRes.data);
        setCourses(coursesRes.data.filter((c) => c.status !== "inactive"));
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
  }, [open, isEdit, reloadKey]);

  // Keep the current course selectable before the list loads (or if it's now inactive)
  const courseOptions: CourseOption[] = [...courses];
  const currentCourse = enrollment?.course;
  if (currentCourse && !courses.some((c) => c.id === currentCourse.id)) {
    courseOptions.unshift(currentCourse);
  }

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: enrollment?.student.id ?? "",
      courseId: enrollment?.course.id ?? "",
      status: enrollment?.status ?? "active",
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  const submit = async (values: Values) => {
    setServerError(null);
    try {
      const { data } = enrollment
        ? await enrollmentsApi.update(enrollment.id, {
            courseId: values.courseId,
            status: values.status,
          })
        : await enrollmentsApi.create(values);
      onSaved(data);
      handleOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("courseId", { message: err.message });
        return;
      }
      setServerError(
        err instanceof ApiError ? err.message : "Could not save the enrollment",
      );
    }
  };

  const loading = loadStatus === "loading";
  const studentPlaceholder = loading
    ? "Loading students…"
    : students.length
      ? "Select a student"
      : "No active students";
  const coursePlaceholder =
    loading && courseOptions.length === 0
      ? "Loading courses…"
      : courseOptions.length
        ? "Select a course"
        : "No courses available";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {enrollment ? "Edit enrollment" : "Enroll a student"}
          </DialogTitle>
          <DialogDescription>
            {enrollment
              ? "Change the status, or move the student to another course."
              : "Add an active student to a course."}
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

          {enrollment ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Student</p>
              <div className="rounded-lg border border-border-soft bg-field px-3 py-2">
                <p className="text-sm font-medium text-ink">
                  {enrollment.student.name}
                </p>
                <p className="text-xs text-sub">{enrollment.student.email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="studentId">Student</Label>
              <select
                id="studentId"
                {...register("studentId")}
                aria-invalid={!!errors.studentId}
                className={selectClass}
              >
                <option value="">{studentPlaceholder}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
              {loadStatus === "ready" && students.length === 0 && (
                <p className="text-xs text-sub">
                  No active students yet. Add one from User Management first.
                </p>
              )}
              {errors.studentId && (
                <p className="text-sm text-danger">{errors.studentId.message}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <div className="space-y-2">
              <Label htmlFor="courseId">Course</Label>
              <select
                id="courseId"
                {...register("courseId")}
                aria-invalid={!!errors.courseId}
                className={selectClass}
              >
                <option value="">{coursePlaceholder}</option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.code}
                    {c.status !== "published" ? ` (${c.status})` : ""}
                  </option>
                ))}
              </select>
              {errors.courseId && (
                <p className="text-sm text-danger">{errors.courseId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register("status")}
                className={`${selectClass} capitalize`}
              >
                {ENROLLMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                : enrollment
                  ? "Save changes"
                  : "Enroll student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
