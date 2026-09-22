"use client";

import { useState } from "react";
import { ScheduleFormModal } from "../_components/ScheduleFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { coursesApi } from "@/lib/api/courses";
import { scheduleApi, type ScheduleEvent } from "@/lib/api/schedule";
import { usersApi } from "@/lib/api/users";
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

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [courseId, setCourseId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null);

  const courseFilter = useApiQuery("schedule:courses", () =>
    coursesApi.list({ pageSize: 100 }),
  );
  const teacherFilter = useApiQuery("schedule:teachers", () =>
    usersApi.list({ role: "teacher", pageSize: 100 }),
  );

  const params = {
    from: weekStart.toISOString(),
    to: addDays(weekStart, 7).toISOString(),
    courseId: courseId === "all" ? undefined : courseId,
    teacherId: teacherId === "all" ? undefined : teacherId,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    JSON.stringify(params),
    () => scheduleApi.list(params),
  );

  const events = data?.data ?? [];
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today));

  const openCreate = (date: Date | null) => {
    setEditing(null);
    setDefaultDate(date);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openEdit = (event: ScheduleEvent) => {
    setEditing(event);
    setDefaultDate(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (event: ScheduleEvent) => {
    setFormOpen(false);
    setDeleteTarget(event);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await scheduleApi.remove(deleteTarget.id);
    reload();
  };

  // Jump to the saved class's week so it's visible
  const handleSaved = (event: ScheduleEvent) => {
    const savedWeek = startOfWeek(new Date(event.start));
    if (isSameDay(savedWeek, weekStart)) reload();
    else setWeekStart(savedWeek);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Schedule</h1>
          <p className="mt-1 text-sm text-sub">
            Plan the weekly timetable for every course and teacher.
          </p>
        </div>
        <Button
          onClick={() => openCreate(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + Schedule Class
        </Button>
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
            Today
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
            <option value="all">All courses</option>
            {courseFilter.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.code}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className={filterClass}
          >
            <option value="all">All teachers</option>
            {teacherFilter.data?.data.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-sub">
            {isLoading && !data ? "Loading…" : `${events.length} classes`}
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load the schedule: {error}</span>
          <button
            type="button"
            onClick={reload}
            className="font-medium underline"
          >
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
          const isToday = isSameDay(day, today);
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day),
          );
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
              <header className="flex items-center justify-between border-b border-border-soft px-3 py-2">
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
                <button
                  type="button"
                  onClick={() => openCreate(day)}
                  aria-label={`Schedule a class on ${formatFullDate(day)}`}
                  className="rounded-lg p-1.5 text-sub hover:bg-field hover:text-brand-indigo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.75}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </button>
              </header>

              <ul className="flex-1 space-y-2 p-2">
                {isLoading && !data && (
                  <li>
                    <div className="h-16 animate-pulse rounded-xl bg-field" />
                  </li>
                )}

                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(e)}
                      className="w-full rounded-xl border border-border-soft bg-field/60 p-2.5 text-left transition hover:border-brand-indigo/40 hover:bg-indigo-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40"
                    >
                      <p className="text-xs font-semibold text-brand-indigo">
                        {formatTime(new Date(e.start))} –{" "}
                        {formatTime(new Date(e.end))}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink">
                        {e.title}
                      </p>
                      <p className="truncate text-xs text-sub">
                        {e.course.code} ·{" "}
                        {e.teacher?.name ?? (
                          <span className="italic">No teacher</span>
                        )}
                      </p>
                      {e.location && (
                        <p className="truncate text-xs text-sub">
                          {e.location}
                        </p>
                      )}
                    </button>
                  </li>
                ))}

                {data && dayEvents.length === 0 && (
                  <li className="px-1 py-4 text-center text-xs text-sub/70">
                    No classes
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <ScheduleFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editing}
        defaultDate={defaultDate}
        onSaved={handleSaved}
        onDelete={askDelete}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete class?"
        confirmLabel="Delete class"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.title}</strong> on{" "}
              {formatFullDate(new Date(deleteTarget.start))} at{" "}
              {formatTime(new Date(deleteTarget.start))} from the timetable.
            </>
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
