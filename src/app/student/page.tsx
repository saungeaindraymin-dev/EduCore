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
import { assignmentsApi } from "@/lib/api/assignments";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { quizzesApi } from "@/lib/api/quizzes";
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
import { useAuthStore } from "@/stores/useAuthStore";

const DUE_SOON_DAYS = 14;
const MAX_DUE_SOON = 6;
const MAX_UPCOMING = 5;
const MAX_COURSES = 6;

type DueItem = {
  id: string;
  kind: "assignment" | "quiz";
  title: string;
  courseCode: string;
  dueAt: Date | null;
  detail: string;
};

/** "Due today", "Due in 3 days", "Overdue" — or an open piece of work with no deadline */
function dueLabel(item: DueItem, now: Date) {
  if (!item.dueAt) return "No deadline";
  const days = Math.round((item.dueAt.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Fixed for this visit so query keys and date ranges stay stable between renders
  const [now] = useState(() => new Date());
  const weekStart = startOfWeek(now);
  const weekEnd = addDays(weekStart, 7);

  // Every one of these is already scoped to this student by the API
  const enrollments = useApiQuery("student-dashboard:enrollments", () =>
    enrollmentsApi.list({ pageSize: 100 }),
  );
  const schedule = useApiQuery(
    `student-dashboard:schedule:${weekStart.toISOString()}`,
    () =>
      scheduleApi.list({
        from: weekStart.toISOString(),
        to: addDays(weekStart, 14).toISOString(),
      }),
  );
  const assignments = useApiQuery("student-dashboard:assignments", () =>
    assignmentsApi.list({ pageSize: 100 }),
  );
  const quizzes = useApiQuery("student-dashboard:quizzes", () =>
    quizzesApi.list({ pageSize: 100 }),
  );
  const announcements = useApiQuery("student-dashboard:announcements", () =>
    announcementsApi.list({ pageSize: 3 }),
  );

  const myCourses = (enrollments.data?.data ?? []).filter((e) => e.status === "active");

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

  // Work still to hand in: published assignments and quizzes, soonest first, undated last
  const horizon = addDays(now, DUE_SOON_DAYS);
  const dueItems: DueItem[] = [
    ...(assignments.data?.data ?? [])
      .filter((a) => a.status === "published")
      .map((a) => ({
        id: a.id,
        kind: "assignment" as const,
        title: a.title,
        courseCode: a.course.code,
        dueAt: a.dueAt ? new Date(a.dueAt) : null,
        detail: `${a.totalPoints} points`,
      })),
    ...(quizzes.data?.data ?? [])
      .filter((q) => q.status === "published")
      .map((q) => ({
        id: q.id,
        kind: "quiz" as const,
        title: q.title,
        courseCode: q.course.code,
        dueAt: q.dueAt ? new Date(q.dueAt) : null,
        detail: `${q.questions} question${q.questions === 1 ? "" : "s"}`,
      })),
  ]
    .filter((item) => !item.dueAt || item.dueAt <= horizon)
    .sort((a, b) => {
      if (!a.dueAt) return b.dueAt ? 1 : 0;
      if (!b.dueAt) return -1;
      return a.dueAt.getTime() - b.dueAt.getTime();
    });

  const dueThisWeek = dueItems.filter(
    (item) => item.dueAt && item.dueAt >= now && item.dueAt <= addDays(now, 7),
  ).length;

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
        <p className="mt-1 text-sm text-sub">Here&apos;s what&apos;s coming up.</p>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My courses"
          value={statValue(enrollments, myCourses.length)}
          icon={<NavIcon name="book" />}
        />
        <StatCard
          label="Classes this week"
          value={statValue(schedule, classesThisWeek)}
          icon={<NavIcon name="calendar" />}
        />
        <StatCard
          label="Due this week"
          value={assignments.data && quizzes.data ? dueThisWeek : "…"}
          icon={<NavIcon name="clipboard-check" />}
        />
        <StatCard
          label="Next class"
          value={statValue(schedule, nextClassLabel)}
          icon={<NavIcon name="clock" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Due soon"
          subtitle={`Assignments and quizzes, next ${DUE_SOON_DAYS} days`}
          className="lg:col-span-2"
        >
          <PanelState
            loading={
              (assignments.isLoading && !assignments.data) ||
              (quizzes.isLoading && !quizzes.data)
            }
            error={assignments.error ?? quizzes.error}
            onRetry={() => {
              assignments.reload();
              quizzes.reload();
            }}
            empty={dueItems.length === 0}
            emptyText="Nothing due — you're all caught up."
          >
            <ul className="divide-y divide-border-soft">
              {dueItems.slice(0, MAX_DUE_SOON).map((item) => {
                const overdue = !!item.dueAt && item.dueAt < now;
                return (
                  <li key={`${item.kind}-${item.id}`} className="flex items-center gap-4 py-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        item.kind === "quiz"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-indigo-50 text-brand-indigo"
                      }`}
                    >
                      <NavIcon
                        name={item.kind === "quiz" ? "check-badge" : "clipboard-check"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.title}</p>
                      <p className="truncate text-xs text-sub">
                        {item.courseCode} · {item.kind === "quiz" ? "Quiz" : "Assignment"} ·{" "}
                        {item.detail}
                        {item.dueAt ? ` · ${formatDateTime(item.dueAt)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold ${
                        overdue ? "text-danger" : "text-sub"
                      }`}
                    >
                      {dueLabel(item, now)}
                    </span>
                  </li>
                );
              })}
            </ul>
            {dueItems.length > MAX_DUE_SOON && (
              <p className="pt-3 text-xs text-sub">
                + {dueItems.length - MAX_DUE_SOON} more
              </p>
            )}
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
          subtitle={enrollments.data ? `${myCourses.length} enrolled` : undefined}
          className="lg:col-span-2"
          action={
            <Link
              href="/student/courses"
              className="text-sm font-medium text-brand-indigo hover:underline"
            >
              All courses
            </Link>
          }
        >
          <PanelState
            loading={enrollments.isLoading && !enrollments.data}
            error={enrollments.error}
            onRetry={enrollments.reload}
            empty={myCourses.length === 0}
            emptyText="You're not enrolled in any courses yet."
          >
            <ul className="divide-y divide-border-soft">
              {myCourses.slice(0, MAX_COURSES).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/student/courses/${e.course.id}`}
                    className="group flex items-center gap-4 py-3"
                  >
                    <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
                      <NavIcon name="book" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink group-hover:text-brand-indigo">
                        {e.course.title}
                      </p>
                      <p className="truncate text-xs text-sub">{e.course.code}</p>
                    </div>
                    <StatusPill status={e.status} />
                  </Link>
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

        <Panel title="Upcoming classes" subtitle="Next 7 days">
          <PanelState
            loading={schedule.isLoading && !schedule.data}
            error={schedule.error}
            onRetry={schedule.reload}
            empty={upcoming.length === 0}
            emptyText="No classes in the next 7 days."
          >
            <ul className="divide-y divide-border-soft">
              {upcoming.map((event) => (
                <UpcomingClass key={event.id} event={event} now={now} />
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

function UpcomingClass({ event, now }: { event: ScheduleEvent; now: Date }) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const inProgress = start <= now && end > now;

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-indigo-50 py-1.5 text-brand-indigo">
        <span className="text-[11px] font-semibold uppercase">{formatWeekday(start)}</span>
        <span className="font-heading text-lg font-bold leading-tight">
          {start.getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{event.title}</p>
        <p className="truncate text-xs text-sub">
          {formatTime(start)} – {formatTime(end)} · {event.course.code}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>
      {inProgress && (
        <span className="shrink-0 rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success">
          Now
        </span>
      )}
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
      <div role="alert" className="flex items-center justify-between gap-3 text-sm text-danger">
        <span>Couldn&apos;t load this: {error}</span>
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-field" />
        ))}
      </div>
    );
  }
  if (empty) return <p className="py-6 text-center text-sm text-sub">{emptyText}</p>;
  return <>{children}</>;
}
