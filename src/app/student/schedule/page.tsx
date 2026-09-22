"use client";

import { useState } from "react";
import { ClassDetailsDialog } from "@/components/ClassDetailsDialog";
import { useApiQuery } from "@/hooks/useApiQuery";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { scheduleApi, type ScheduleEvent } from "@/lib/api/schedule";
import {
  addDays,
  formatFullDate,
  formatTime,
  formatWeekday,
  formatWeekRange,
  isSameDay,
  startOfWeek,
} from "@/lib/dates";

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const navButtonClass =
  "h-10 rounded-lg border border-border-soft bg-surface px-3 text-sm font-medium text-ink hover:bg-field";

const classCount = (n: number) => `${n} ${n === 1 ? "class" : "classes"}`;

/** Total class time in a week, e.g. "6h 30m" */
function totalHours(events: ScheduleEvent[]) {
  const minutes = events.reduce(
    (sum, e) => sum + (new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000,
    0,
  );
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function StudentSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [courseId, setCourseId] = useState("all");
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);

  // Their own courses, for the filter and for linking a class to its course page
  const courses = useApiQuery("student-schedule:courses", () =>
    enrollmentsApi.list({ status: "active", pageSize: 100 }),
  );
  const myCourseIds = new Set(
    (courses.data?.data ?? []).map((enrollment) => enrollment.course.id),
  );

  // The API already limits a student to classes on courses they're actively enrolled in
  const params = {
    from: weekStart.toISOString(),
    to: addDays(weekStart, 7).toISOString(),
    courseId: courseId === "all" ? undefined : courseId,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `student-schedule:${JSON.stringify(params)}`,
    () => scheduleApi.list(params),
  );

  const events = data?.data ?? [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const now = new Date();
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(now));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Schedule</h1>
        <p className="mt-1 text-sm text-sub">
          Your classes for the week. Tap one for the room and the teacher.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            aria-label="Previous week"
            className={navButtonClass}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={isCurrentWeek}
            className={`${navButtonClass} disabled:opacity-50`}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            aria-label="Next week"
            className={navButtonClass}
          >
            ›
          </button>
        </div>
        <h2 className="font-heading text-lg font-semibold text-ink">
          {formatWeekRange(weekStart)}
        </h2>

        <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <select
            aria-label="Filter by course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={`${filterClass} max-w-xs`}
          >
            <option value="all">All my courses</option>
            {courses.data?.data.map((enrollment) => (
              <option key={enrollment.course.id} value={enrollment.course.id}>
                {enrollment.course.title} — {enrollment.course.code}
              </option>
            ))}
          </select>
          <span className="text-sm text-sub">
            {isLoading && !data
              ? "Loading…"
              : `${classCount(events.length)}${
                  events.length ? ` · ${totalHours(events)}` : ""
                }`}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load your schedule: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div
        className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-7 transition-opacity ${
          isLoading && data ? "opacity-60" : ""
        }`}
      >
        {days.map((day) => {
          const isToday = isSameDay(day, now);
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start), day));
          return (
            <section
              key={day.toISOString()}
              aria-label={formatFullDate(day)}
              className={`flex min-h-44 flex-col rounded-2xl border bg-surface shadow-sm ${
                isToday
                  ? "border-brand-indigo/40 ring-1 ring-brand-indigo/20"
                  : "border-border-soft"
              }`}
            >
              <header className="flex items-baseline justify-between border-b border-border-soft px-3 py-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sub">
                    {formatWeekday(day)}
                  </p>
                  <p
                    className={`font-heading text-lg font-bold ${
                      isToday ? "text-brand-indigo" : "text-ink"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
                {dayEvents.length > 0 && (
                  <span className="text-xs font-medium text-sub">{dayEvents.length}</span>
                )}
              </header>

              <ul className="flex-1 space-y-2 p-2">
                {isLoading && !data && (
                  <li>
                    <div className="h-16 animate-pulse rounded-xl bg-field" />
                  </li>
                )}

                {dayEvents.map((e) => {
                  const start = new Date(e.start);
                  const end = new Date(e.end);
                  const inProgress = start <= now && end > now;
                  const isOver = end <= now;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(e)}
                        aria-label={`${e.title}, ${formatTime(start)} to ${formatTime(end)}`}
                        className={`w-full rounded-xl border p-2.5 text-left transition hover:border-brand-indigo/40 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40 ${
                          inProgress
                            ? "border-success/30 bg-success-bg"
                            : "border-border-soft bg-field/60"
                        } ${isOver ? "opacity-60" : ""}`}
                      >
                        <p
                          className={`text-xs font-semibold ${
                            inProgress ? "text-success" : "text-brand-indigo"
                          }`}
                        >
                          {formatTime(start)} – {formatTime(end)}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-ink">
                          {e.title}
                        </p>
                        <p className="truncate text-xs text-sub">{e.course.code}</p>
                        {e.location && (
                          <p className="truncate text-xs text-sub">{e.location}</p>
                        )}
                      </button>
                    </li>
                  );
                })}

                {data && dayEvents.length === 0 && (
                  <li className="px-1 py-4 text-center text-xs text-sub/70">No classes</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <ClassDetailsDialog
        event={selected}
        onClose={() => setSelected(null)}
        courseHref={
          selected && myCourseIds.has(selected.course.id)
            ? `/student/courses/${selected.course.id}`
            : null
        }
      />
    </div>
  );
}
