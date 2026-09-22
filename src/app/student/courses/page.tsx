"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { coursesApi, type Course } from "@/lib/api/courses";
import {
  ENROLLMENT_STATUSES,
  enrollmentsApi,
  type EnrollmentStatus,
} from "@/lib/api/enrollments";

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function StudentCoursesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EnrollmentStatus>("active");

  const q = useDebouncedValue(query.trim(), 300);
  // The API returns only this student's enrollments
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    pageSize: 100,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `student-courses:${JSON.stringify(params)}`,
    () => enrollmentsApi.list(params),
  );

  // Published courses carry the teacher, category and lesson count the cards show
  const details = useApiQuery("student-courses:details", () =>
    coursesApi.list({ pageSize: 100 }),
  );
  const detailsById = new Map<string, Course>(
    (details.data?.data ?? []).map((course) => [course.id, course]),
  );

  const rows = data?.data ?? [];
  const filtered = !!(q || status !== "active");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">My Courses</h1>
        <p className="mt-1 text-sm text-sub">
          Everything you&apos;re enrolled in. Open one to read its lessons.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search my courses"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or code…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by enrollment status"
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | EnrollmentStatus)}
          className={`${filterClass} capitalize`}
        >
          <option value="all">All enrollments</option>
          {ENROLLMENT_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(rows.length, "course")}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load your courses: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <ul
        className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity ${
          isLoading && data ? "opacity-60" : ""
        }`}
      >
        {isLoading &&
          !data &&
          Array.from({ length: 6 }, (_, i) => (
            <li
              key={`skeleton-${i}`}
              className="h-48 animate-pulse rounded-2xl border border-border-soft bg-surface"
            />
          ))}

        {rows.map((enrollment) => {
          const course = detailsById.get(enrollment.course.id);
          // An enrollment the student can't open yet: the course isn't published
          const open = enrollment.status === "active" && !!course;
          const card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                  <NavIcon name="book" />
                </div>
                <StatusPill status={enrollment.status} />
              </div>
              <h2
                className={`font-heading mt-4 line-clamp-2 text-lg font-semibold text-ink ${
                  open ? "group-hover:text-brand-indigo" : ""
                }`}
              >
                {enrollment.course.title}
              </h2>
              <p className="mt-1 text-xs text-sub">
                {enrollment.course.code}
                {course ? ` · ${course.category}` : ""}
              </p>
              {course?.teacher && (
                <p className="mt-2 text-sm text-ink-soft">{course.teacher.name}</p>
              )}
              <div className="mt-auto flex items-center gap-4 pt-4 text-xs font-medium text-sub">
                {course ? (
                  <span>{plural(course.lessons, "lesson")}</span>
                ) : (
                  <span className="italic">Not open yet</span>
                )}
                {enrollment.status === "pending" && <span>Awaiting approval</span>}
              </div>
            </>
          );

          return (
            <li key={enrollment.id}>
              {open ? (
                <Link
                  href={`/student/courses/${enrollment.course.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-5 shadow-sm transition hover:border-brand-indigo/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40"
                >
                  {card}
                </Link>
              ) : (
                <div className="flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-5 opacity-80 shadow-sm">
                  {card}
                </div>
              )}
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="col-span-full rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filtered
                ? "No courses match your filters."
                : "You're not enrolled in any courses yet."}
            </p>
            {!filtered && (
              <p className="mt-2 text-sm text-sub">
                An administrator enrolls students in courses.
              </p>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
