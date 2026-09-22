"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  AUDIENCE_LABELS,
  announcementsApi,
  type Announcement,
} from "@/lib/api/announcements";
import { coursesApi } from "@/lib/api/courses";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { scheduleApi, type ScheduleEvent } from "@/lib/api/schedule";
import {
  addDays,
  formatDateTime,
  formatFullDate,
  formatTime,
  formatWeekday,
  isSameDay,
  startOfWeek,
} from "@/lib/dates";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

const MAX_COURSES = 6;
const MAX_UPCOMING = 5;

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? "";

  // Fixed for this visit so query keys (and date ranges) stay stable between renders
  const [now] = useState(() => new Date());
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  // The API already limits what a teacher can read to their own courses and classes
  const courses = useApiQuery(`teacher-dashboard:courses:${teacherId}`, () =>
    coursesApi.list({ teacherId, pageSize: 100 }),
  );
  // This week plus the next, so "the next 7 days" is covered from any weekday
  const schedule = useApiQuery(
    `teacher-dashboard:schedule:${weekStart.toISOString()}`,
    () =>
      scheduleApi.list({
        from: weekStart.toISOString(),
        to: addDays(weekStart, 14).toISOString(),
      }),
  );
  const enrollments = useApiQuery("teacher-dashboard:enrollments", () =>
    enrollmentsApi.list({ pageSize: 5 }),
  );
  const announcements = useApiQuery("teacher-dashboard:announcements", () =>
    announcementsApi.list({ pageSize: 3 }),
  );

  const myCourses = courses.data?.data ?? [];
  const activeEnrollments = myCourses.reduce((sum, c) => sum + c.students, 0);

  const events = schedule.data?.data ?? [];
  const classesThisWeek = events.filter((e) => {
    const start = new Date(e.start);
    return start >= weekStart && start < weekEnd;
  }).length;
  const upcoming = events
    .filter((e) => new Date(e.end) > now && new Date(e.start) < addDays(now, 7))
    .slice(0, MAX_UPCOMING);

  const nextClass = upcoming[0] ? new Date(upcoming[0].start) : null;
  const nextClassLabel = nextClass
    ? `${isSameDay(nextClass, now) ? "Today" : formatWeekday(nextClass)} ${formatTime(nextClass)}`
    : "None";

  const statValue = (
    query: { data?: unknown; error?: string },
    value: string | number,
  ) => (query.data ? value : query.error ? "—" : "…");

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-sub">{formatFullDate(now)}</p>
        <h1 className="font-heading mt-1 text-3xl font-bold text-ink">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-sub">
          Here&apos;s your teaching week at a glance.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My courses"
          value={statValue(courses, myCourses.length)}
          icon={<NavIcon name="book" />}
        />
        <StatCard
          label="Active enrollments"
          value={statValue(courses, activeEnrollments)}
          icon={<NavIcon name="user-group" />}
        />
        <StatCard
          label="Classes this week"
          value={statValue(schedule, classesThisWeek)}
          icon={<NavIcon name="calendar" />}
        />
        <StatCard
          label="Next class"
          value={statValue(schedule, nextClassLabel)}
          icon={<NavIcon name="clock" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Upcoming classes"
          subtitle="Next 7 days"
          className="lg:col-span-2"
          action={
            <Link
              href="/teacher/schedule"
              className="text-sm font-medium text-brand-indigo hover:underline"
            >
              View schedule
            </Link>
          }
        >
          <PanelState
            loading={schedule.isLoading && !schedule.data}
            error={schedule.error}
            onRetry={schedule.reload}
            empty={upcoming.length === 0}
            emptyText="No classes in the next 7 days."
          >
            <ul className="divide-y divide-border-soft">
              {upcoming.map((event) => (
                <UpcomingClass
                  key={event.id}
                  event={event}
                  now={now}
                  teacherId={teacherId}
                />
              ))}
            </ul>
          </PanelState>
        </Panel>

        <Panel title="Announcements" subtitle="Latest for you">
          <PanelState
            loading={announcements.isLoading && !announcements.data}
            error={announcements.error}
            onRetry={announcements.reload}
            empty={(announcements.data?.data.length ?? 0) === 0}
            emptyText="No announcements right now."
          >
            <ul className="divide-y divide-border-soft">
              {announcements.data?.data.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-sub">
                    {audienceLabel(a)}
                    {a.publishedAt
                      ? ` · ${formatDateTime(new Date(a.publishedAt))}`
                      : ""}
                  </p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          </PanelState>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="My courses"
          subtitle={courses.data ? `${myCourses.length} total` : undefined}
          className="lg:col-span-2"
        >
          <PanelState
            loading={courses.isLoading && !courses.data}
            error={courses.error}
            onRetry={courses.reload}
            empty={myCourses.length === 0}
            emptyText="You haven't been assigned any courses yet."
          >
            <ul className="divide-y divide-border-soft">
              {myCourses.slice(0, MAX_COURSES).map((c) => (
                <li key={c.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                    <p className="truncate text-xs text-sub">
                      {c.code} · {c.category}
                    </p>
                  </div>
                  <span className="hidden text-sm text-ink-soft sm:inline">
                    {c.students} {c.students === 1 ? "student" : "students"}
                  </span>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
            {myCourses.length > MAX_COURSES && (
              <p className="pt-3 text-xs text-sub">
                + {myCourses.length - MAX_COURSES} more
              </p>
            )}
          </PanelState>
        </Panel>

        <Panel
          title="Recent enrollments"
          subtitle="In your courses"
          action={
            <Link
              href="/teacher/students"
              className="text-sm font-medium text-brand-indigo hover:underline"
            >
              All students
            </Link>
          }
        >
          <PanelState
            loading={enrollments.isLoading && !enrollments.data}
            error={enrollments.error}
            onRetry={enrollments.reload}
            empty={(enrollments.data?.data.length ?? 0) === 0}
            emptyText="No enrollments yet."
          >
            <ul className="divide-y divide-border-soft">
              {enrollments.data?.data.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {initials(e.student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {e.student.name}
                    </p>
                    <p className="truncate text-xs text-sub">
                      {e.course.code} · {new Date(e.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          </PanelState>
        </Panel>
      </div>
    </div>
  );
}

function audienceLabel(a: Announcement) {
  if (a.audience === "course" && a.course) return a.course.code;
  return AUDIENCE_LABELS[a.audience];
}

function UpcomingClass({
  event,
  now,
  teacherId,
}: {
  event: ScheduleEvent;
  now: Date;
  teacherId: string;
}) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const inProgress = start <= now && end > now;
  const coveredBy =
    event.teacher && event.teacher.id !== teacherId ? event.teacher.name : null;

  return (
    <li className="flex items-center gap-4 py-3">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-indigo-50 py-1.5 text-brand-indigo">
        <span className="text-[11px] font-semibold uppercase">
          {formatWeekday(start)}
        </span>
        <span className="font-heading text-lg font-bold leading-tight">
          {start.getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{event.title}</p>
        <p className="truncate text-xs text-sub">
          {formatTime(start)} – {formatTime(end)} · {event.course.code}
          {event.location ? ` · ${event.location}` : ""}
          {coveredBy ? ` · taught by ${coveredBy}` : ""}
        </p>
      </div>
      {inProgress ? (
        <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
          In progress
        </span>
      ) : isSameDay(start, now) ? (
        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-indigo">
          Today
        </span>
      ) : null}
    </li>
  );
}

function Panel({
  title,
  subtitle,
  className = "",
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-border-soft bg-surface p-6 shadow-sm ${className}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-sub">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function PanelState({
  loading,
  error,
  onRetry,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  error?: string;
  onRetry: () => void;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger"
      >
        <span>{error}</span>
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-field" />
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <p className="rounded-lg border border-dashed border-border-soft px-4 py-8 text-center text-sm text-sub">
        {emptyText}
      </p>
    );
  }
  return <>{children}</>;
}
