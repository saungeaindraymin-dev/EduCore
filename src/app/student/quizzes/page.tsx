"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { quizzesApi, type Quiz } from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

type Filter = "todo" | "done" | "all";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Can this student still sit it? Mirrors the rules the API enforces. */
function canSit(quiz: Quiz, now: Date) {
  if (quiz.status !== "published") return false;
  if (quiz.dueAt && new Date(quiz.dueAt) < now) return false;
  return (quiz.attemptsLeft ?? 0) > 0;
}

export default function StudentQuizzesPage() {
  const [now] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [filter, setFilter] = useState<Filter>("todo");

  const courses = useApiQuery("student-quizzes:courses", () =>
    enrollmentsApi.list({ status: "active", pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API returns published quizzes in courses this student is actively enrolled in,
  // each carrying their own attempt count and best score
  const params = {
    q: q || undefined,
    courseId: courseId === "all" ? undefined : courseId,
    pageSize: 100,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `student-quizzes:${JSON.stringify(params)}`,
    () => quizzesApi.list(params),
  );

  const all = data?.data ?? [];
  const toSit = all.filter((quiz) => canSit(quiz, now));
  const sat = all.filter((quiz) => (quiz.myAttempts ?? 0) > 0);
  const rows = filter === "all" ? all : filter === "done" ? sat : toSit;

  const averageBest = sat.length
    ? Math.round(
        sat.reduce((sum, quiz) => sum + (quiz.bestScore?.percentage ?? 0), 0) / sat.length,
      )
    : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Quizzes</h1>
        <p className="mt-1 text-sm text-sub">
          Sit a quiz and see your marks straight away.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        <StatCard
          label="To sit"
          value={data ? toSit.length : "…"}
          icon={<NavIcon name="check-badge" />}
        />
        <StatCard
          label="Completed"
          value={data ? sat.length : "…"}
          icon={<NavIcon name="clipboard-check" />}
        />
        <StatCard
          label="Average score"
          value={data ? (averageBest === null ? "—" : `${averageBest}%`) : "…"}
          icon={<NavIcon name="grid" />}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search quizzes"
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
          aria-label="Filter quizzes"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          className={filterClass}
        >
          <option value="todo">To sit</option>
          <option value="done">Completed</option>
          <option value="all">Everything</option>
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data
            ? "Loading…"
            : `${rows.length} ${rows.length === 1 ? "quiz" : "quizzes"}`}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load your quizzes: {error}</span>
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

        {rows.map((quiz) => {
          const open = canSit(quiz, now);
          const closed =
            quiz.status === "closed" ||
            (!!quiz.dueAt && new Date(quiz.dueAt) < now && quiz.status === "published");
          return (
            <li key={quiz.id}>
              <Link
                href={`/student/quizzes/${quiz.id}`}
                className="group flex items-start gap-4 rounded-2xl border border-border-soft bg-surface p-5 shadow-sm transition hover:border-brand-indigo/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <NavIcon name="check-badge" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-base font-semibold text-ink group-hover:text-brand-indigo">
                      {quiz.title}
                    </p>
                    {quiz.status === "closed" && <StatusPill status="closed" />}
                  </div>
                  <p className="mt-0.5 text-xs text-sub">
                    {quiz.course.code} · {plural(quiz.questions, "question")}
                    {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}
                    {quiz.dueAt ? ` · due ${formatDateTime(new Date(quiz.dueAt))}` : ""}
                  </p>
                  {quiz.description && (
                    <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                      {quiz.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {quiz.bestScore ? (
                    <>
                      <p
                        className={`font-heading text-lg font-bold ${
                          quiz.bestScore.percentage >= 50 ? "text-success" : "text-danger"
                        }`}
                      >
                        {quiz.bestScore.percentage}%
                      </p>
                      <p className="text-xs text-sub">
                        {quiz.bestScore.score} / {quiz.bestScore.maxScore}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-medium text-sub">Not sat yet</p>
                  )}
                  <p className="mt-1 text-xs text-sub">
                    {open
                      ? `${plural(quiz.attemptsLeft ?? 0, "try")} left`
                      : closed
                        ? "Closed"
                        : "No tries left"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filter === "done"
                ? "You haven't sat any quizzes yet."
                : all.length === 0
                  ? "No quizzes have been set for your courses yet."
                  : "Nothing to sit right now."}
            </p>
          </li>
        )}
      </ul>
    </div>
  );
}
