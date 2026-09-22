"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CourseWorkPanel } from "../../_components/CourseWorkPanel";
import { LessonReader } from "../../_components/LessonReader";
import { StatusPill } from "@/components/StatusPill";
import { useApiQuery } from "@/hooks/useApiQuery";
import { coursesApi } from "@/lib/api/courses";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { scheduleApi } from "@/lib/api/schedule";
import { addDays, formatTime, formatWeekday, isSameDay } from "@/lib/dates";

const TABS = [
  { key: "lessons", label: "Lessons" },
  { key: "work", label: "Work" },
  { key: "schedule", label: "Classes" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const CLASS_DAYS_AHEAD = 30;

export default function StudentCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("lessons");

  const { data, error, isLoading, reload } = useApiQuery(`student-course:${id}`, () =>
    coursesApi.get(id),
  );
  const course = data?.data;

  // The student's own enrollment in this course — the API only returns theirs
  const enrollment = useApiQuery(`student-course-enrollment:${id}`, () =>
    enrollmentsApi.list({ courseId: id, pageSize: 1 }),
  );
  const myEnrollment = enrollment.data?.data[0];

  if (isLoading && !course) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="h-40 animate-pulse rounded-2xl border border-border-soft bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-border-soft bg-surface" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Notice
          title="You can't open this course"
          body={
            error ??
            "It may not be published yet, or you're not enrolled. Ask an administrator if this looks wrong."
          }
        >
          <button
            type="button"
            onClick={reload}
            className="font-medium text-brand-indigo hover:underline"
          >
            Try again
          </button>
        </Notice>
      </div>
    );
  }

  // Enrolled but not active: the lessons API would refuse, so say why up front
  const blocked = enrollment.data && myEnrollment?.status !== "active";

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
                {course.title}
              </h1>
              {myEnrollment && <StatusPill status={myEnrollment.status} />}
            </div>
            <p className="mt-1 text-sm text-sub">
              {course.code} · {course.category}
              {course.teacher ? ` · ${course.teacher.name}` : ""}
            </p>
            {course.description && (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
                {course.description}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-5 sm:grid-cols-3">
          <Stat label="Lessons" value={course.lessons} />
          <Stat label="Classmates" value={course.students} />
          <Stat
            label="Enrolled"
            value={
              myEnrollment
                ? new Date(myEnrollment.enrolledAt).toLocaleDateString()
                : "—"
            }
          />
        </dl>
      </header>

      {blocked && (
        <div
          role="status"
          className="rounded-2xl border border-warning/30 bg-warning-bg px-6 py-3 text-sm text-warning"
        >
          Your place on this course is{" "}
          <strong>{myEnrollment?.status ?? "not active"}</strong>, so the lessons stay
          locked until an administrator activates it.
        </div>
      )}

      <div
        role="tablist"
        aria-label="Course sections"
        className="flex w-fit gap-1 rounded-xl border border-border-soft bg-surface p-1 shadow-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40 ${
              tab === t.key
                ? "bg-brand-gradient text-white shadow-brand"
                : "text-sub hover:bg-field hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "lessons" &&
          // Don't fetch lessons we know the API will refuse — say why instead
          (blocked ? (
            <section className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center shadow-sm">
              <h2 className="font-heading text-lg font-semibold text-ink">
                Lessons are locked
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-sub">
                They open as soon as an administrator makes your place on this course
                active.
              </p>
            </section>
          ) : (
            <LessonReader courseId={course.id} />
          ))}
        {tab === "work" && <CourseWorkPanel courseId={course.id} />}
        {tab === "schedule" && <CourseClasses courseId={course.id} />}
      </div>
    </div>
  );
}

function CourseClasses({ courseId }: { courseId: string }) {
  const [now] = useState(() => new Date());
  const { data, error, isLoading, reload } = useApiQuery(
    `student-course-classes:${courseId}:${now.toISOString()}`,
    () =>
      scheduleApi.list({
        courseId,
        from: now.toISOString(),
        to: addDays(now, CLASS_DAYS_AHEAD).toISOString(),
      }),
  );
  const classes = data?.data ?? [];

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="border-b border-border-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">Classes</h2>
        <p className="text-xs text-sub">Next {CLASS_DAYS_AHEAD} days.</p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load the classes: {error}</span>
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

        {classes.map((event) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          return (
            <li key={event.id} className="flex items-center gap-4 px-5 py-3">
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
                  {start.toLocaleDateString(undefined, { month: "short" })} ·{" "}
                  {formatTime(start)} – {formatTime(end)}
                  {event.location ? ` · ${event.location}` : ""}
                  {event.teacher ? ` · ${event.teacher.name}` : ""}
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
          <li className="px-5 py-12 text-center text-sm text-sub">
            No classes scheduled in the next {CLASS_DAYS_AHEAD} days.
          </li>
        )}
      </ul>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      href="/student/courses"
      className="inline-flex items-center gap-1 text-sm font-medium text-sub hover:text-brand-indigo"
    >
      ← My Courses
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-sub">{label}</dt>
      <dd className="font-heading mt-1 text-xl font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center shadow-sm">
      <h1 className="font-heading text-xl font-semibold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-sub">{body}</p>
      {children && <div className="mt-4 text-sm">{children}</div>}
    </div>
  );
}
