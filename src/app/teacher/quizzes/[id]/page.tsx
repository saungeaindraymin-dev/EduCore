"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { QuestionFormModal } from "../../_components/QuestionFormModal";
import { QuizResultsPanel } from "../../_components/QuizResultsPanel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ApiError } from "@/lib/api/client";
import {
  QUESTION_TYPE_LABELS,
  quizzesApi,
  type QuizQuestion,
  type QuizStatus,
} from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";

const TABS = [
  { key: "questions", label: "Questions" },
  { key: "results", label: "Results" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function TeacherQuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = useAuthStore((s) => s.user?.id);

  const [tab, setTab] = useState<TabKey>("questions");
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<QuizQuestion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, isLoading, reload } = useApiQuery(`teacher-quiz:${id}`, () =>
    quizzesApi.get(id),
  );
  const quiz = data?.data;

  if (isLoading && !quiz) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="h-40 animate-pulse rounded-2xl border border-border-soft bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-border-soft bg-surface" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-6">
        <BackLink />
        <Notice title="Couldn't load this quiz" body={error ?? "Something went wrong."}>
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

  const questions = quiz.questions;
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const isMine = quiz.createdBy?.id === userId;

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...questions];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => quizzesApi.reorderQuestions(quiz.id, next.map((q) => q.id)));
  };

  const setStatus = (status: QuizStatus) =>
    run(() => quizzesApi.update(quiz.id, { status }));

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
                {quiz.title}
              </h1>
              <StatusPill status={quiz.status} />
            </div>
            <p className="mt-1 text-sm text-sub">
              {quiz.course.code} · {quiz.course.title}
              {!isMine && quiz.createdBy ? ` · set by ${quiz.createdBy.name}` : ""}
            </p>
            {quiz.description && (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
                {quiz.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {quiz.status !== "published" ? (
              <Button
                onClick={() => setStatus("published")}
                disabled={busy || questions.length === 0}
                title={questions.length === 0 ? "Add a question first" : undefined}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                {quiz.status === "draft" ? "Publish" : "Reopen"}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setStatus("closed")} disabled={busy}>
                Close quiz
              </Button>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-5 sm:grid-cols-4">
          <Stat label="Questions" value={questions.length} />
          <Stat label="Total points" value={totalPoints} />
          <Stat
            label="Attempts allowed"
            value={quiz.attemptsAllowed === 1 ? "One" : quiz.attemptsAllowed}
          />
          <Stat
            label="Deadline"
            value={quiz.dueAt ? formatDateTime(new Date(quiz.dueAt)) : "None"}
          />
        </dl>
      </header>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Quiz sections"
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
        {tab === "questions" ? (
          <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft p-5">
              <div>
                <h2 className="font-heading text-lg font-semibold text-ink">Questions</h2>
                <p className="text-xs text-sub">
                  Ticked answers are the marking key — attempts are scored against them.
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormKey((k) => k + 1);
                  setFormOpen(true);
                }}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                + Add question
              </Button>
            </header>

            <ol className="divide-y divide-border-soft">
              {questions.map((question, index) => (
                <li key={question.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {index + 1}. {question.text}
                      </p>
                      <p className="mt-0.5 text-xs text-sub">
                        {QUESTION_TYPE_LABELS[question.type]} ·{" "}
                        {plural(question.points, "point")}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={busy || index === 0}
                        aria-label={`Move question ${index + 1} up`}
                        className="rounded-lg px-2 py-1 text-sub hover:bg-field hover:text-ink disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={busy || index === questions.length - 1}
                        aria-label={`Move question ${index + 1} down`}
                        className="rounded-lg px-2 py-1 text-sub hover:bg-field hover:text-ink disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(question);
                          setFormKey((k) => k + 1);
                          setFormOpen(true);
                        }}
                        className="ml-2 text-sm font-medium text-brand-indigo hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(question);
                          setDeleteOpen(true);
                        }}
                        className="ml-3 text-sm font-medium text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {question.options.map((option) => (
                      <li
                        key={option.id}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                          option.isCorrect
                            ? "bg-success-bg text-success"
                            : "bg-field text-ink-soft"
                        }`}
                      >
                        <span aria-hidden className="w-4 text-center">
                          {option.isCorrect ? "✓" : "○"}
                        </span>
                        <span className="min-w-0 flex-1">{option.text}</span>
                        {option.isCorrect && (
                          <span className="text-xs font-semibold uppercase tracking-wider">
                            Correct
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}

              {questions.length === 0 && (
                <li className="px-5 py-12 text-center text-sm text-sub">
                  No questions yet. Add one to get this quiz ready to publish.
                </li>
              )}
            </ol>
          </section>
        ) : (
          <QuizResultsPanel quizId={quiz.id} attemptsAllowed={quiz.attemptsAllowed} />
        )}
      </div>

      <QuestionFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        quizId={quiz.id}
        question={editing}
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete question?"
        confirmLabel="Delete question"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.text}</strong> and its answers from the
              quiz.
            </>
          )
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await quizzesApi.removeQuestion(quiz.id, deleteTarget.id);
          reload();
        }}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/teacher/quizzes"
      className="inline-flex items-center gap-1 text-sm font-medium text-sub hover:text-brand-indigo"
    >
      ← Quizzes
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
