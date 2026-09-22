"use client";

import { useState } from "react";
import { NavIcon } from "@/components/shell/NavIcon";
import { StatusPill } from "@/components/StatusPill";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assignmentsApi } from "@/lib/api/assignments";
import { quizzesApi } from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";

type WorkItem = {
  id: string;
  kind: "assignment" | "quiz";
  title: string;
  description: string;
  dueAt: Date | null;
  detail: string;
  status: string;
};

function dueLabel(item: WorkItem, now: Date) {
  if (!item.dueAt) return "No deadline";
  const days = Math.round((item.dueAt.getTime() - now.getTime()) / 86_400_000);
  const when = formatDateTime(item.dueAt);
  if (item.status === "closed") return `Closed · was due ${when}`;
  if (days < 0) return `Overdue · was due ${when}`;
  if (days === 0) return `Due today · ${when}`;
  if (days === 1) return `Due tomorrow · ${when}`;
  return `Due in ${days} days · ${when}`;
}

/** Assignments and quizzes for one course. Students see published work only. */
export function CourseWorkPanel({ courseId }: { courseId: string }) {
  const [now] = useState(() => new Date());

  const assignments = useApiQuery(`student-course-assignments:${courseId}`, () =>
    assignmentsApi.list({ courseId, pageSize: 100 }),
  );
  const quizzes = useApiQuery(`student-course-quizzes:${courseId}`, () =>
    quizzesApi.list({ courseId, pageSize: 100 }),
  );

  const loading =
    (assignments.isLoading && !assignments.data) || (quizzes.isLoading && !quizzes.data);
  const error = assignments.error ?? quizzes.error;

  const items: WorkItem[] = [
    ...(assignments.data?.data ?? []).map((a) => ({
      id: a.id,
      kind: "assignment" as const,
      title: a.title,
      description: a.description,
      dueAt: a.dueAt ? new Date(a.dueAt) : null,
      detail: `${a.totalPoints} points`,
      status: a.status,
    })),
    ...(quizzes.data?.data ?? []).map((q) => ({
      id: q.id,
      kind: "quiz" as const,
      title: q.title,
      description: q.description,
      dueAt: q.dueAt ? new Date(q.dueAt) : null,
      detail: `${q.questions} question${q.questions === 1 ? "" : "s"} · ${
        q.attemptsAllowed === 1 ? "one try" : `${q.attemptsAllowed} tries`
      }`,
      status: q.status,
    })),
  ].sort((a, b) => {
    if (!a.dueAt) return b.dueAt ? 1 : 0;
    if (!b.dueAt) return -1;
    return a.dueAt.getTime() - b.dueAt.getTime();
  });

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="border-b border-border-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">Work</h2>
        <p className="text-xs text-sub">
          Assignments and quizzes set for this course.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load the work: {error}</span>
          <button
            type="button"
            onClick={() => {
              assignments.reload();
              quizzes.reload();
            }}
            className="font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <ul className="divide-y divide-border-soft">
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={`skeleton-${i}`} className="p-5">
              <div className="h-12 animate-pulse rounded-lg bg-field" />
            </li>
          ))}

        {items.map((item) => {
          const overdue =
            item.status === "published" && !!item.dueAt && item.dueAt < now;
          return (
            <li key={`${item.kind}-${item.id}`} className="flex gap-4 px-5 py-4">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.kind === "quiz"
                    ? "bg-violet-50 text-violet-600"
                    : "bg-indigo-50 text-brand-indigo"
                }`}
              >
                <NavIcon name={item.kind === "quiz" ? "check-badge" : "clipboard-check"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  {item.status === "closed" && <StatusPill status="closed" />}
                </div>
                <p className="text-xs text-sub">
                  {item.kind === "quiz" ? "Quiz" : "Assignment"} · {item.detail}
                </p>
                {item.description && (
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                    {item.description}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 text-right text-xs font-medium ${
                  overdue ? "text-danger" : "text-sub"
                }`}
              >
                {dueLabel(item, now)}
              </span>
            </li>
          );
        })}

        {!loading && !error && items.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-sub">
            Nothing set for this course yet.
          </li>
        )}
      </ul>
    </section>
  );
}
