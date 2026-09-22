"use client";

import { useState } from "react";
import { StudentDetailsDialog } from "../_components/StudentDetailsDialog";
import { Pagination } from "@/components/Pagination";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { coursesApi } from "@/lib/api/courses";
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from "@/lib/api/enrollments";
import { studentsApi, type Student, type StudentCourse } from "@/lib/api/students";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 10;
const MAX_COURSE_CHIPS = 2;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const CHIP_STYLES: Record<EnrollmentStatus, string> = {
  active: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
  dropped: "bg-slate-100 text-slate-500 line-through",
};

export default function TeacherStudentsPage() {
  const teacherId = useAuthStore((s) => s.user?.id) ?? "";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EnrollmentStatus>("all");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);

  const courseFilter = useApiQuery(`teacher-students:courses:${teacherId}`, () =>
    coursesApi.list({ teacherId, pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API only returns students enrolled in a course this teacher teaches
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    courseId: courseId === "all" ? undefined : courseId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `teacher-students:${JSON.stringify(params)}`,
    () => studentsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || status !== "all" || courseId !== "all");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Students</h1>
        <p className="mt-1 text-sm text-sub">
          Everyone enrolled in a course you teach. Enrollments are managed by an
          administrator.
        </p>
      </header>

      <div className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <input
            type="search"
            aria-label="Search students"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email…"
            className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
          />
          <select
            aria-label="Filter by course"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setPage(1);
            }}
            className={`${filterClass} max-w-xs`}
          >
            <option value="all">All my courses</option>
            {courseFilter.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.code}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by enrollment status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | EnrollmentStatus);
              setPage(1);
            }}
            className={`${filterClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {ENROLLMENT_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-sub">
            {isLoading && !data ? "Loading…" : plural(total, "student")}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 bg-danger-bg px-6 py-3 text-sm text-danger"
          >
            <span>Couldn&apos;t load your students: {error}</span>
            <button type="button" onClick={reload} className="font-medium underline">
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">My courses</th>
                <th className="px-6 py-3">Active</th>
                <th className="px-6 py-3">Latest</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-border-soft transition-opacity ${
                isLoading && data ? "opacity-60" : ""
              }`}
            >
              {isLoading &&
                !data &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td colSpan={4} className="px-6 py-4">
                      <div className="h-9 animate-pulse rounded-lg bg-field" />
                    </td>
                  </tr>
                ))}

              {rows.map((student) => {
                const shown = student.courses.slice(0, MAX_COURSE_CHIPS);
                const extra = student.courses.length - shown.length;
                return (
                  <tr
                    key={student.id}
                    onClick={() => setSelected(student)}
                    className="cursor-pointer hover:bg-field/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                          {initials(student.name)}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(student);
                            }}
                            className="font-medium text-ink hover:text-brand-indigo hover:underline"
                          >
                            {student.name}
                          </button>
                          <p className="text-xs text-sub">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {shown.map((c) => (
                          <CourseChip key={c.enrollmentId} course={c} />
                        ))}
                        {extra > 0 && (
                          <span className="text-xs text-sub">+{extra} more</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-ink-soft">
                      {student.activeCourses} of {student.courses.length}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-ink-soft">
                      {student.lastEnrolledAt?.slice(0, 10) ?? "—"}
                    </td>
                  </tr>
                );
              })}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-sub">
                    {filtered
                      ? "No students match your filters."
                      : "No one is enrolled in your courses yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>

      <StudentDetailsDialog student={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// The course code, tinted by that student's enrollment status in it
function CourseChip({ course }: { course: StudentCourse }) {
  return (
    <span
      title={`${course.title} · ${course.enrollmentStatus}`}
      className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
        CHIP_STYLES[course.enrollmentStatus]
      }`}
    >
      {course.code}
    </span>
  );
}
