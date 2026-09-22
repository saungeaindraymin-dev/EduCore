"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { assignmentsApi, type Assignment } from "@/lib/api/assignments";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { formatDateTime } from "@/lib/dates";

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

type Filter = "todo" | "all" | "overdue";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function dueLabel(assignment: Assignment, now: Date) {
  if (!assignment.dueAt) return "No deadline";
  const due = new Date(assignment.dueAt);
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
  const when = formatDateTime(due);
  if (assignment.status === "closed") return `Closed · was due ${when}`;
  if (days < 0) return `Overdue · was due ${when}`;
  if (days === 0) return `Due today · ${when}`;
  if (days === 1) return `Due tomorrow · ${when}`;
  return `Due in ${days} days · ${when}`;
}

export default function StudentAssignmentsPage() {
  const [now] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [filter, setFilter] = useState<Filter>("todo");

  const courses = useApiQuery("student-assignments:courses", () =>
    enrollmentsApi.list({ status: "active", pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API returns published work in courses this student is actively enrolled in
  const params = {
    q: q || undefined,
    courseId: courseId === "all" ? undefined : courseId,
    pageSize: 100,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `student-assignments:${JSON.stringify(params)}`,
    () => assignmentsApi.list(params),
  );

  const all = data?.data ?? [];
  const overdue = all.filter(
    (a) => a.status === "published" && !!a.dueAt && new Date(a.dueAt) < now,
  );
  const openWork = all.filter((a) => a.status === "published");
  const rows =
    filter === "all" ? all : filter === "overdue" ? overdue : openWork;

  const dueThisWeek = openWork.filter((a) => {
    if (!a.dueAt) return false;
    const due = new Date(a.dueAt);
    return due >= now && due.getTime() - now.getTime() <= 7 * 86_400_000;
  }).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Assignments</h1>
        <p className="mt-1 text-sm text-sub">
          Work set for your courses. Open one to read it and hand yours in.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        <StatCard
          label="Open"
          value={data ? openWork.length : "…"}
          icon={<NavIcon name="clipboard-check" />}
        />
        <StatCard
          label="Due this week"
          value={data ? dueThisWeek : "…"}
          icon={<NavIcon name="clock" />}
        />
        <StatCard
          label="Overdue"
          value={data ? overdue.length : "…"}
          icon={<NavIcon name="megaphone" />}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search assignments"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or course…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className={`${filterClass} max-w-xs`}
        >
          <option value="all">All my courses</option>
          {courses.data?.data.map((e) => (
            <option key={e.course.id} value={e.course.id}>
              {e.course.title} — {e.course.code}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter work"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className={filterClass}
        >
          <option value="todo">Still open</option>
          <option value="overdue">Overdue</option>
          <option value="all">Everything</option>
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(rows.length, "assignment")}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load your assignments: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <ul
        className={`space-y-4 transition-opacity ${isLoading && data ? "opacity-60" : ""}`}
      >
        {isLoading &&
          !data &&
          Array.from({ length: 3 }, (_, i) => (
            <li
              key={`skeleton-${i}`}
              className="h-28 animate-pulse rounded-2xl border border-border-soft bg-surface"
            />
          ))}

        {rows.map((a) => {
          const isOverdue =
            a.status === "published" && !!a.dueAt && new Date(a.dueAt) < now;
          return (
            <li key={a.id}>
              <Link
                href={`/student/assignments/${a.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-border-soft bg-surface p-5 shadow-sm transition hover:border-brand-indigo/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-brand-indigo">
                  <NavIcon name="clipboard-check" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-base font-semibold text-ink group-hover:text-brand-indigo">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs text-sub">
                    {a.course.code} · {a.course.title} · {a.totalPoints} points
                  </p>
                  {a.description && (
                    <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                      {a.description}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-right text-xs font-medium ${
                    isOverdue ? "text-danger" : "text-sub"
                  }`}
                >
                  {dueLabel(a, now)}
                </span>
              </Link>
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filter === "overdue"
                ? "Nothing overdue — nicely done."
                : all.length === 0
                  ? "No assignments have been set for your courses yet."
                  : "Nothing open right now."}
            </p>
          </li>
        )}
      </ul>
    </div>
  );
}
