"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { Skeleton, SkeletonStack } from "@/components/Skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { dashboardApi, type Trend } from "@/lib/api/dashboard";
import {
  formatFullDate,
  formatTime,
  formatWeekday,
  isSameDay,
} from "@/lib/dates";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

/** "+12.5%" growth against 30 days ago, or "+3 new" when there was nothing to compare with */
function growth(current: number, monthAgo: number) {
  const added = current - monthAgo;
  if (added === 0) return undefined;
  if (monthAgo === 0) return { value: `${added} new`, positive: added > 0 };
  const pct = (added / monthAgo) * 100;
  return {
    value: `${Math.abs(pct) >= 10 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%`,
    positive: pct > 0,
  };
}

/** "2h ago", "3d ago" */
function ago(iso: string, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [now] = useState(() => new Date());

  const { data, error, isLoading, reload } = useApiQuery("admin-dashboard", () =>
    dashboardApi.admin(),
  );
  const overview = data?.data;
  const stats = overview?.stats;

  const value = (n: number | undefined) =>
    overview ? (n ?? 0).toLocaleString() : "—";
  // Nothing has arrived yet — the cards show placeholders instead of stand-in numbers
  const statsLoading = !overview && !error;
  const trend = (t: Trend | undefined) => (t ? growth(t.total, t.monthAgo) : undefined);

  const attention = overview
    ? [
        {
          label: "Enrollments waiting for approval",
          count: overview.attention.pendingEnrollments,
          href: "/enrollments",
          action: "Review",
        },
        {
          label: "Courses without a teacher",
          count: overview.attention.coursesWithoutTeacher,
          href: "/courses",
          action: "Assign",
        },
        {
          label: "Draft courses not yet published",
          count: overview.attention.draftCourses,
          href: "/courses",
          action: "Open",
        },
        {
          label: "Submissions waiting to be marked",
          count: overview.attention.awaitingMarking,
          href: "/assignments",
          action: "View",
        },
      ]
    : [];
  const needsAttention = attention.filter((item) => item.count > 0);

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sub">{formatFullDate(now)}</p>
          <h1 className="font-heading mt-1 text-3xl font-bold text-ink">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-sub">Here&apos;s how the institute looks today.</p>
        </div>
        {overview && (
          <button
            type="button"
            onClick={reload}
            className="text-sm font-medium text-sub hover:text-brand-indigo"
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load the dashboard: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* Headline numbers, each against where it stood 30 days ago */}
      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active students"
          value={value(stats?.students.total)}
          loading={statsLoading}
          delta={trend(stats?.students)}
          icon={<NavIcon name="user-group" />}
        />
        <StatCard
          label="Teachers"
          value={value(stats?.teachers.total)}
          loading={statsLoading}
          delta={trend(stats?.teachers)}
          icon={<NavIcon name="users" />}
        />
        <StatCard
          label="Published courses"
          value={value(stats?.courses.published)}
          loading={statsLoading}
          delta={
            stats
              ? growth(stats.courses.published, stats.courses.publishedMonthAgo)
              : undefined
          }
          icon={<NavIcon name="book" />}
        />
        <StatCard
          label="Active enrollments"
          value={value(stats?.enrollments.active)}
          loading={statsLoading}
          delta={
            stats
              ? growth(stats.enrollments.active, stats.enrollments.activeMonthAgo)
              : undefined
          }
          icon={<NavIcon name="clipboard" />}
        />
      </section>

      {/* Course work at a glance */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Open assignments" value={value(stats?.work.openAssignments)} href="/assignments" loading={statsLoading} />
        <MiniStat label="Waiting to be marked" value={value(stats?.work.awaitingMarking)} href="/assignments" loading={statsLoading} />
        <MiniStat label="Live quizzes" value={value(stats?.work.publishedQuizzes)} loading={statsLoading} />
        <MiniStat label="Quiz attempts (30 days)" value={value(stats?.work.quizAttemptsThisMonth)} loading={statsLoading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Recent enrollments"
          className="lg:col-span-2"
          action={
            <Link href="/enrollments" className="text-sm font-medium text-brand-indigo hover:underline">
              View all
            </Link>
          }
        >
          <PanelBody
            loading={isLoading && !overview}
            empty={!!overview && overview.recentEnrollments.length === 0}
            emptyText="No enrollments yet."
          >
            <ul className="divide-y divide-border-soft">
              {overview?.recentEnrollments.map((e) => (
                <li key={e.id} className="flex items-center gap-4 py-3">
                  <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {initials(e.student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{e.student.name}</p>
                    <p className="truncate text-xs text-sub">
                      enrolled in {e.course.title} ({e.course.code})
                    </p>
                  </div>
                  <StatusPill status={e.status} />
                  <span className="hidden w-16 shrink-0 text-right text-xs text-sub sm:inline">
                    {ago(e.enrolledAt, now)}
                  </span>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>

        <Panel title="Needs attention">
          <PanelBody
            loading={isLoading && !overview}
            empty={!!overview && needsAttention.length === 0}
            emptyText="Nothing waiting on you. 🎉"
          >
            <ul className="space-y-2">
              {needsAttention.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-3 rounded-xl border border-border-soft p-3 transition hover:border-brand-indigo/40 hover:bg-field/60"
                  >
                    <span className="font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-bg text-sm font-bold text-warning">
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-ink">{item.label}</span>
                    <span className="shrink-0 text-xs font-medium text-brand-indigo group-hover:underline">
                      {item.action}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Top courses"
          subtitle="By active students"
          className="lg:col-span-2"
          action={
            <Link href="/courses" className="text-sm font-medium text-brand-indigo hover:underline">
              All courses
            </Link>
          }
        >
          <PanelBody
            loading={isLoading && !overview}
            empty={!!overview && overview.topCourses.length === 0}
            emptyText="No published courses yet."
          >
            <ul className="space-y-3">
              {overview?.topCourses.map((course) => {
                const most = overview.topCourses[0]?.activeStudents || 1;
                return (
                  <li key={course.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium text-ink">
                        {course.title}{" "}
                        <span className="text-xs font-normal text-sub">
                          {course.code}
                          {course.teacher ? ` · ${course.teacher.name}` : " · no teacher"}
                        </span>
                      </p>
                      <span className="shrink-0 text-sm font-semibold text-ink">
                        {course.activeStudents}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-field">
                      <div
                        className="bg-brand-gradient h-full rounded-full"
                        style={{ width: `${(course.activeStudents / most) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>

        <Panel
          title="Upcoming classes"
          subtitle="Next 7 days"
          action={
            <Link href="/schedule" className="text-sm font-medium text-brand-indigo hover:underline">
              Timetable
            </Link>
          }
        >
          <PanelBody
            loading={isLoading && !overview}
            empty={!!overview && overview.upcomingClasses.length === 0}
            emptyText="No classes in the next 7 days."
          >
            <ul className="space-y-3">
              {overview?.upcomingClasses.map((c) => {
                const start = new Date(c.start);
                const end = new Date(c.end);
                const live = start <= now && end > now;
                return (
                  <li key={c.id} className="rounded-lg border border-border-soft p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-ink">{c.title}</p>
                      {live && (
                        <span className="shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                          Now
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-sub">
                      {isSameDay(start, now) ? "Today" : formatWeekday(start)},{" "}
                      {formatTime(start)} · {c.course.code}
                      {c.teacher ? ` · ${c.teacher.name}` : ""}
                      {c.location ? ` · ${c.location}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
  loading,
}: {
  label: string;
  value: string;
  href?: string;
  loading?: boolean;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-sub">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-16" />
      ) : (
        <p className="font-heading mt-1 text-xl font-bold text-ink">{value}</p>
      )}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-border-soft bg-surface px-4 py-3 shadow-sm transition hover:border-brand-indigo/40"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-border-soft bg-surface px-4 py-3 shadow-sm">{body}</div>
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
    <section className={`rounded-2xl border border-border-soft bg-surface p-6 shadow-sm ${className}`}>
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

function PanelBody({
  loading,
  empty,
  emptyText,
  children,
}: {
  loading: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <SkeletonStack rows={4} className="space-y-2" rowClassName="h-12 rounded-lg" />
    );
  }
  if (empty) return <p className="py-6 text-center text-sm text-sub">{emptyText}</p>;
  return <>{children}</>;
}
