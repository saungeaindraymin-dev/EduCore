"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmissionFileList } from "@/components/SubmissionFileList";
import { SkeletonStack } from "@/components/Skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assignmentsApi, type MySubmission } from "@/lib/api/assignments";
import { formatDateTime } from "@/lib/dates";

const LATEST_FEEDBACK = 3;
const WAITING = 5;

/**
 * The dashboard row for handed-in work: the teacher's latest marks and feedback (with the
 * files the student handed in, downloadable), and what's still waiting to be marked.
 */
export function FeedbackPanels() {
  const marked = useApiQuery("student-dashboard:marked", () =>
    assignmentsApi.mySubmissions({ graded: true, limit: LATEST_FEEDBACK }),
  );
  const waiting = useApiQuery("student-dashboard:waiting", () =>
    assignmentsApi.mySubmissions({ graded: false, limit: WAITING }),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm lg:col-span-2">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">Latest feedback</h2>
            <p className="text-xs text-sub">Marks and comments from your teachers</p>
          </div>
          <Link
            href="/student/assignments"
            className="text-sm font-medium text-brand-indigo hover:underline"
          >
            All assignments
          </Link>
        </header>

        <Body
          loading={marked.isLoading && !marked.data}
          error={marked.error}
          onRetry={marked.reload}
          empty={(marked.data?.data.length ?? 0) === 0}
          emptyText="Nothing marked yet — feedback shows up here as soon as a teacher marks your work."
        >
          <ul className="space-y-4">
            {marked.data?.data.map((work) => (
              <FeedbackCard key={work.id} work={work} />
            ))}
          </ul>
        </Body>
      </section>

      <section className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="font-heading text-lg font-semibold text-ink">Waiting to be marked</h2>
          <p className="text-xs text-sub">Handed in, not marked yet</p>
        </header>

        <Body
          loading={waiting.isLoading && !waiting.data}
          error={waiting.error}
          onRetry={waiting.reload}
          empty={(waiting.data?.data.length ?? 0) === 0}
          emptyText="Nothing waiting."
        >
          <ul className="divide-y divide-border-soft">
            {waiting.data?.data.map((work) => (
              <li key={work.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/student/assignments/${work.assignment.id}`}
                  className="text-sm font-medium text-ink hover:text-brand-indigo hover:underline"
                >
                  {work.assignment.title}
                </Link>
                <p className="text-xs text-sub">
                  {work.assignment.course.code} · handed in{" "}
                  {formatDateTime(new Date(work.submittedAt))}
                  {work.isLate && <span className="text-warning"> · late</span>}
                  {work.files.length > 0 &&
                    ` · ${work.files.length} file${work.files.length === 1 ? "" : "s"}`}
                </p>
              </li>
            ))}
          </ul>
        </Body>
      </section>
    </div>
  );
}

function FeedbackCard({ work }: { work: MySubmission }) {
  const [showWork, setShowWork] = useState(false);
  const total = work.assignment.totalPoints;
  const percentage = total ? Math.round(((work.score ?? 0) / total) * 100) : 0;
  const good = percentage >= 50;

  return (
    <li className="rounded-xl border border-border-soft p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/student/assignments/${work.assignment.id}`}
            className="font-medium text-ink hover:text-brand-indigo hover:underline"
          >
            {work.assignment.title}
          </Link>
          <p className="text-xs text-sub">
            {work.assignment.course.code}
            {work.gradedBy ? ` · marked by ${work.gradedBy.name}` : ""}
            {work.gradedAt ? ` · ${formatDateTime(new Date(work.gradedAt))}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-heading text-xl font-bold ${good ? "text-success" : "text-warning"}`}>
            {work.score}/{total}
          </p>
          <p className="text-xs text-sub">{percentage}%</p>
        </div>
      </div>

      {work.feedback ? (
        <blockquote className="mt-3 whitespace-pre-line border-l-4 border-brand-indigo/40 bg-indigo-50/40 px-3 py-2 text-sm leading-relaxed text-ink-soft">
          {work.feedback}
        </blockquote>
      ) : (
        <p className="mt-3 text-sm italic text-sub">No written feedback — just the mark.</p>
      )}

      {(work.files.length > 0 || work.content) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowWork((open) => !open)}
            aria-expanded={showWork}
            className="text-sm font-medium text-brand-indigo hover:underline"
          >
            {showWork
              ? "Hide what you handed in"
              : `What you handed in${
                  work.files.length
                    ? ` · ${work.files.length} file${work.files.length === 1 ? "" : "s"}`
                    : ""
                }`}
          </button>
          {showWork && (
            <div className="mt-2 space-y-2">
              {work.content && (
                <p className="whitespace-pre-line rounded-lg bg-field px-3 py-2 text-sm text-ink-soft">
                  {work.content}
                </p>
              )}
              <SubmissionFileList submissionId={work.id} files={work.files} />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Body({
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
      <SkeletonStack rows={2} className="space-y-2" rowClassName="h-20 rounded-lg" />
    );
  }
  if (empty) return <p className="py-6 text-center text-sm text-sub">{emptyText}</p>;
  return <>{children}</>;
}
