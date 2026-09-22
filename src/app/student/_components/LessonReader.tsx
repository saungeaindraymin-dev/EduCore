"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { lessonsApi } from "@/lib/api/lessons";

/** Published lessons only — the API withholds drafts from students. */
export function LessonReader({ courseId }: { courseId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, error, isLoading, reload } = useApiQuery(
    `student-lessons:${courseId}`,
    () => lessonsApi.list(courseId),
  );
  const lessons = data?.data ?? [];

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="border-b border-border-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">Lessons</h2>
        <p className="text-xs text-sub">
          {lessons.length > 0
            ? "Pick a lesson to read it."
            : "Your teacher publishes lessons here."}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load the lessons: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <ol className="divide-y divide-border-soft">
        {isLoading &&
          !data &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={`skeleton-${i}`} className="p-5">
              <div className="h-10 animate-pulse rounded-lg bg-field" />
            </li>
          ))}

        {lessons.map((lesson, index) => {
          const open = openId === lesson.id;
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : lesson.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-field/50"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                    open ? "bg-brand-gradient text-white" : "bg-field text-sub"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                  {lesson.title}
                </span>
                <span aria-hidden className="shrink-0 text-sub">
                  {open ? "▴" : "▾"}
                </span>
              </button>

              {open && (
                <div className="border-t border-border-soft bg-field/40 px-5 py-4">
                  {lesson.content ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                      {lesson.content}
                    </p>
                  ) : (
                    <p className="text-sm italic text-sub">
                      This lesson doesn&apos;t have any notes yet.
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}

        {data && !error && lessons.length === 0 && (
          <li className="px-5 py-12 text-center text-sm text-sub">
            No lessons published yet.
          </li>
        )}
      </ol>
    </section>
  );
}
