"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CourseFormModal } from "@/components/CourseFormModal";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { coursesApi } from "@/lib/api/courses";
import { useAuthStore } from "@/stores/useAuthStore";
import { CourseSchedulePanel } from "../../_components/CourseSchedulePanel";
import { CourseStudentsPanel } from "../../_components/CourseStudentsPanel";
import { LessonsPanel } from "../../_components/LessonsPanel";

const TABS = [
  { key: "lessons", label: "Lessons" },
  { key: "students", label: "Students" },
  { key: "schedule", label: "Schedule" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function TeacherCourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const [tab, setTab] = useState<TabKey>("lessons");
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const { data, error, isLoading, reload } = useApiQuery(`teacher-course:${id}`, () =>
    coursesApi.get(id),
  );
  const course = data?.data;

  if (isLoading && !course) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="h-48 animate-pulse rounded-2xl border border-border-soft bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-border-soft bg-surface" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Notice title="Couldn't load this course" body={error ?? "Something went wrong."}>
          <button type="button" onClick={reload} className="font-medium text-brand-indigo hover:underline">
            Try again
          </button>
        </Notice>
      </div>
    );
  }

  if (course.teacher?.id !== userId) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Notice
          title="This course isn't assigned to you"
          body="You can only manage courses you teach. Ask an administrator if this looks wrong."
        />
      </div>
    );
  }

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
              <StatusPill status={course.status} />
            </div>
            <p className="mt-1 text-sm text-sub">
              {course.code} · {course.category}
            </p>
            {course.description && (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
                {course.description}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setFormKey((k) => k + 1);
              setFormOpen(true);
            }}
          >
            Edit course
          </Button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-5 sm:grid-cols-3">
          <Stat label="Active students" value={course.students} />
          <Stat label="Lessons" value={course.lessons} />
          <Stat label="Created" value={new Date(course.createdAt).toLocaleDateString()} />
        </dl>
      </header>

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
              tab === t.key ? "bg-brand-gradient text-white shadow-brand" : "text-sub hover:bg-field hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "lessons" && <LessonsPanel courseId={course.id} onCountChanged={reload} />}
        {tab === "students" && <CourseStudentsPanel courseId={course.id} />}
        {tab === "schedule" && <CourseSchedulePanel courseId={course.id} />}
      </div>

      <CourseFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        course={course}
        assignTeacher={false}
        onSaved={reload}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/teacher/courses"
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
