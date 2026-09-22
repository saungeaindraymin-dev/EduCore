"use client";

import Link from "next/link";
import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { coursesApi, type CourseStatus } from "@/lib/api/courses";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 12;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function TeacherCoursesPage() {
  const teacherId = useAuthStore((s) => s.user?.id) ?? "";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CourseStatus>("all");
  const [page, setPage] = useState(1);

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    teacherId,
    q: q || undefined,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(JSON.stringify(params), () =>
    coursesApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || status !== "all");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">My Courses</h1>
        <p className="mt-1 text-sm text-sub">
          Courses assigned to you. Open one to manage its lessons, students, and classes.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search my courses"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search title or code…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "all" | CourseStatus);
            setPage(1);
          }}
          className={filterClass}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(total, "course")}
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

        {rows.map((course) => (
          <li key={course.id}>
            <Link
              href={`/teacher/courses/${course.id}`}
              className="group flex h-full flex-col rounded-2xl border border-border-soft bg-surface p-5 shadow-sm transition hover:border-brand-indigo/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white">
                  <NavIcon name="book" />
                </div>
                <StatusPill status={course.status} />
              </div>
              <h2 className="font-heading mt-4 line-clamp-2 text-lg font-semibold text-ink group-hover:text-brand-indigo">
                {course.title}
              </h2>
              <p className="mt-1 text-xs text-sub">
                {course.code} · {course.category}
              </p>
              {course.description && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{course.description}</p>
              )}
              <div className="mt-auto flex items-center gap-4 pt-4 text-xs font-medium text-sub">
                <span>{plural(course.students, "student")}</span>
                <span>{plural(course.lessons, "lesson")}</span>
              </div>
            </Link>
          </li>
        ))}

        {!isLoading && !error && rows.length === 0 && (
          <li className="col-span-full rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filtered ? "No courses match your filters." : "You don't teach any courses yet."}
            </p>
            {!filtered && (
              <p className="mt-2 text-sm text-sub">
                An administrator assigns courses to teachers.
              </p>
            )}
          </li>
        )}
      </ul>

      {total > PAGE_SIZE && (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm [&>div]:border-t-0">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
