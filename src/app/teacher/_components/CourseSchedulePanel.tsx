"use client";

import { useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { scheduleApi } from "@/lib/api/schedule";
import { addDays, formatTime, formatWeekday, isSameDay } from "@/lib/dates";

const DAYS_AHEAD = 60;

export function CourseSchedulePanel({ courseId }: { courseId: string }) {
  // Fixed for this visit so the query key stays stable
  const [now] = useState(() => new Date());
  const { data, error, isLoading, reload } = useApiQuery(
    `course-schedule:${courseId}:${now.toISOString()}`,
    () =>
      scheduleApi.list({
        courseId,
        from: now.toISOString(),
        to: addDays(now, DAYS_AHEAD).toISOString(),
      }),
  );
  const classes = data?.data ?? [];

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="border-b border-border-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">Upcoming classes</h2>
        <p className="text-xs text-sub">
          Next {DAYS_AHEAD} days · Classes are scheduled by an administrator.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load classes: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <ul className="divide-y divide-border-soft">
        {isLoading &&
          !data &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={`skeleton-${i}`} className="p-5">
              <div className="h-12 animate-pulse rounded-lg bg-field" />
            </li>
          ))}
        {classes.map((c) => {
          const start = new Date(c.start);
          const end = new Date(c.end);
          return (
            <li key={c.id} className="flex items-center gap-4 px-5 py-3">
              <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-indigo-50 py-1.5 text-brand-indigo">
                <span className="text-[11px] font-semibold uppercase">{formatWeekday(start)}</span>
                <span className="font-heading text-lg font-bold leading-tight">{start.getDate()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                <p className="truncate text-xs text-sub">
                  {start.toLocaleDateString(undefined, { month: "short" })} ·{" "}
                  {formatTime(start)} – {formatTime(end)}
                  {c.location ? ` · ${c.location}` : ""}
                  {c.teacher ? ` · ${c.teacher.name}` : ""}
                </p>
              </div>
              {isSameDay(start, now) && (
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-indigo">
                  Today
                </span>
              )}
            </li>
          );
        })}
        {data && !error && classes.length === 0 && (
          <li className="px-5 py-10 text-center text-sm text-sub">
            No classes scheduled in the next {DAYS_AHEAD} days.
          </li>
        )}
      </ul>
    </section>
  );
}
