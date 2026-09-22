"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { QuizFormModal } from "../_components/QuizFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api/client";
import { coursesApi } from "@/lib/api/courses";
import {
  QUIZ_STATUSES,
  quizzesApi,
  type Quiz,
  type QuizStatus,
} from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function TeacherQuizzesPage() {
  const router = useRouter();
  const teacherId = useAuthStore((s) => s.user?.id) ?? "";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | QuizStatus>("all");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const courseFilter = useApiQuery(`teacher-quizzes:courses:${teacherId}`, () =>
    coursesApi.list({ teacherId, pageSize: 100 }),
  );
  const teachableCourses = (courseFilter.data?.data ?? []).filter(
    (c) => c.status !== "inactive",
  );

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    courseId: courseId === "all" ? undefined : courseId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `teacher-quizzes:${JSON.stringify(params)}`,
    () => quizzesApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || status !== "all" || courseId !== "all");

  const changeStatus = async (quiz: Quiz, next: QuizStatus) => {
    setBusyId(quiz.id);
    setActionError(null);
    try {
      await quizzesApi.update(quiz.id, { status: next });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Could not update the quiz");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Quizzes</h1>
          <p className="mt-1 text-sm text-sub">
            Write the questions, mark the right answers, and EduCore scores every attempt
            for you.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormKey((k) => k + 1);
            setFormOpen(true);
          }}
          disabled={teachableCourses.length === 0}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + New Quiz
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search quizzes"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search title or course…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by course"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setPage(1);
          }}
          className={`${filterClass} max-w-xs`}
        >
          <option value="all">All my courses</option>
          {courseFilter.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.code}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "all" | QuizStatus);
            setPage(1);
          }}
          className={`${filterClass} capitalize`}
        >
          <option value="all">All statuses</option>
          {QUIZ_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(total, "quiz").replace("quizs", "quizzes")}
        </span>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>{error ? `Couldn't load your quizzes: ${error}` : actionError}</span>
          <button
            type="button"
            onClick={() => (error ? reload() : setActionError(null))}
            className="font-medium underline"
          >
            {error ? "Retry" : "Dismiss"}
          </button>
        </div>
      )}

      <ul
        className={`space-y-4 transition-opacity ${isLoading && data ? "opacity-60" : ""}`}
      >
        {isLoading &&
          !data &&
          Array.from({ length: 3 }, (_, i) => (
            <li
              key={`skeleton-${i}`}
              className="h-32 animate-pulse rounded-2xl border border-border-soft bg-surface"
            />
          ))}

        {rows.map((quiz) => {
          const busy = busyId === quiz.id;
          return (
            <li
              key={quiz.id}
              className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/teacher/quizzes/${quiz.id}`}
                      className="font-heading text-lg font-semibold text-ink hover:text-brand-indigo hover:underline"
                    >
                      {quiz.title}
                    </Link>
                    <StatusPill status={quiz.status} />
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {quiz.course.code} · {plural(quiz.questions, "question")} ·{" "}
                    {plural(quiz.attempts, "attempt")} ·{" "}
                    {quiz.attemptsAllowed === 1
                      ? "one try"
                      : `${quiz.attemptsAllowed} tries`}
                    {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ""}
                  </p>
                </div>
                {quiz.dueAt && (
                  <p className="shrink-0 text-xs font-medium text-sub">
                    Due {formatDateTime(new Date(quiz.dueAt))}
                  </p>
                )}
              </div>

              {quiz.description && (
                <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                  {quiz.description}
                </p>
              )}

              {quiz.questions === 0 && (
                <p className="mt-3 text-xs text-warning">
                  No questions yet — add some before publishing.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Link
                  href={`/teacher/quizzes/${quiz.id}`}
                  className="text-sm font-medium text-brand-indigo hover:underline"
                >
                  Questions &amp; results
                </Link>
                {quiz.status !== "published" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(quiz, "published")}
                    disabled={busy || quiz.questions === 0}
                    className="text-sm font-medium text-success hover:underline disabled:opacity-50"
                    title={quiz.questions === 0 ? "Add a question first" : undefined}
                  >
                    {busy ? "Saving…" : quiz.status === "draft" ? "Publish" : "Reopen"}
                  </button>
                )}
                {quiz.status === "published" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(quiz, "closed")}
                    disabled={busy}
                    className="text-sm font-medium text-warning hover:underline disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Close"}
                  </button>
                )}
                <div className="ml-auto flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(quiz);
                      setFormKey((k) => k + 1);
                      setFormOpen(true);
                    }}
                    className="text-sm font-medium text-brand-indigo hover:underline"
                  >
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(quiz);
                      setDeleteOpen(true);
                    }}
                    className="text-sm font-medium text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filtered
                ? "No quizzes match your filters."
                : teachableCourses.length === 0
                  ? "You need an active course before you can set a quiz."
                  : "You haven't set any quizzes yet."}
            </p>
          </li>
        )}
      </ul>

      {total > PAGE_SIZE && (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm [&>div]:border-t-0">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}

      <QuizFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        quiz={editing}
        teacherId={teacherId}
        defaultCourseId={courseId === "all" ? undefined : courseId}
        onSaved={(quiz) => {
          if (editing) reload();
          // A new quiz has no questions yet — go straight to the editor
          else router.push(`/teacher/quizzes/${quiz.id}`);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete quiz?"
        confirmLabel="Delete quiz"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.title}</strong> from{" "}
              {deleteTarget.course.code}, with its questions and{" "}
              {plural(deleteTarget.attempts, "recorded attempt")}.
            </>
          )
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await quizzesApi.remove(deleteTarget.id);
          reload();
        }}
      />
    </div>
  );
}
