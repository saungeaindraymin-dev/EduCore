"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { QuizRunner } from "../../_components/QuizRunner";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { quizzesApi, type MarkedAttempt } from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function StudentQuizPage() {
  const { id } = useParams<{ id: string }>();
  const [now] = useState(() => new Date());
  const [sitting, setSitting] = useState(false);
  const [justMarked, setJustMarked] = useState<MarkedAttempt | null>(null);

  const { data, error, isLoading, reload } = useApiQuery(`student-quiz:${id}`, () =>
    quizzesApi.get(id),
  );
  const quiz = data?.data;

  // Their own past attempts — the API never returns anyone else's to a student
  const attempts = useApiQuery(`student-quiz-attempts:${id}`, () =>
    quizzesApi.results(id),
  );
  const past = attempts.data?.data ?? [];

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
        <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center shadow-sm">
          <h1 className="font-heading text-xl font-semibold text-ink">
            You can&apos;t open this quiz
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-sub">
            {error ?? "It may not be published, or you're not on that course."}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 text-sm font-medium text-brand-indigo hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const due = quiz.dueAt ? new Date(quiz.dueAt) : null;
  const pastDue = !!due && due < now;
  const attemptsLeft = quiz.attemptsLeft ?? 0;
  const canSit =
    quiz.status === "published" && !pastDue && attemptsLeft > 0 && quiz.questions.length > 0;

  const whyNot = !canSit
    ? quiz.status !== "published"
      ? "This quiz is closed."
      : pastDue
        ? "The deadline has passed."
        : attemptsLeft === 0
          ? "You've used all your tries."
          : "There are no questions in this quiz yet."
    : null;

  const finished = (attempt: MarkedAttempt) => {
    setJustMarked(attempt);
    setSitting(false);
    reload();
    attempts.reload();
  };

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
              {quiz.status === "closed" && <StatusPill status="closed" />}
            </div>
            <p className="mt-1 text-sm text-sub">
              <Link
                href={`/student/courses/${quiz.course.id}`}
                className="hover:text-brand-indigo hover:underline"
              >
                {quiz.course.code} · {quiz.course.title}
              </Link>
            </p>
            {quiz.description && (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-sm text-ink-soft">
                {quiz.description}
              </p>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border-soft pt-5 sm:grid-cols-4">
          <Stat label="Questions" value={quiz.questions.length} />
          <Stat
            label="Time limit"
            value={quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : "None"}
          />
          <Stat
            label="Tries left"
            value={`${attemptsLeft} of ${quiz.attemptsAllowed}`}
          />
          <Stat label="Deadline" value={due ? formatDateTime(due) : "None"} />
        </dl>
      </header>

      {/* The mark, the moment it comes back */}
      {justMarked && (
        <section
          className={`rounded-2xl border p-6 ${
            justMarked.percentage >= 50
              ? "border-success/30 bg-success-bg"
              : "border-warning/30 bg-warning-bg"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2
                className={`font-heading text-lg font-semibold ${
                  justMarked.percentage >= 50 ? "text-success" : "text-warning"
                }`}
              >
                Marked
              </h2>
              <p
                className={`text-xs ${
                  justMarked.percentage >= 50 ? "text-success/80" : "text-warning/80"
                }`}
              >
                {justMarked.questions.filter((q) => q.isCorrect).length} of{" "}
                {justMarked.questions.length} right · try {justMarked.attemptsUsed} of{" "}
                {justMarked.attemptsAllowed}
              </p>
            </div>
            <p
              className={`font-heading text-3xl font-bold ${
                justMarked.percentage >= 50 ? "text-success" : "text-warning"
              }`}
            >
              {justMarked.percentage}%
            </p>
          </div>

          <ol className="mt-4 space-y-1 border-t border-current/20 pt-3">
            {justMarked.questions.map((answer, index) => (
              <li
                key={answer.questionId}
                className={`flex items-center gap-2 text-sm ${
                  justMarked.percentage >= 50 ? "text-success" : "text-warning"
                }`}
              >
                <span aria-hidden>{answer.isCorrect ? "✓" : "✗"}</span>
                <span>Question {index + 1}</span>
                <span className="ml-auto text-xs">
                  {answer.awarded} / {answer.points}
                  {answer.chosenOptionIds.length === 0 && " · no answer"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {sitting ? (
        <QuizRunner quiz={quiz} onFinished={finished} />
      ) : (
        <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
          <header className="border-b border-border-soft p-5">
            <h2 className="font-heading text-lg font-semibold text-ink">
              {past.length > 0 ? "Your attempts" : "Ready when you are"}
            </h2>
            <p className="text-xs text-sub">
              {canSit
                ? `${plural(quiz.questions.length, "question")}${
                    quiz.timeLimitMinutes
                      ? ` · ${quiz.timeLimitMinutes} minutes once you start`
                      : ""
                  } · marked as soon as you hand in.`
                : whyNot}
            </p>
          </header>

          {attempts.error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
            >
              <span>Couldn&apos;t load your attempts: {attempts.error}</span>
              <button
                type="button"
                onClick={attempts.reload}
                className="font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          <ul className="divide-y divide-border-soft">
            {past.map((attempt, index) => (
              <li key={attempt.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-field text-sm font-semibold text-sub">
                  {past.length - index}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {formatDateTime(new Date(attempt.submittedAt))}
                  </p>
                  <p className="text-xs text-sub">
                    {attempt.score} of {attempt.maxScore} points
                  </p>
                </div>
                <p
                  className={`font-heading text-lg font-bold ${
                    attempt.percentage >= 50 ? "text-success" : "text-danger"
                  }`}
                >
                  {attempt.percentage}%
                </p>
              </li>
            ))}

            {attempts.data && !attempts.error && past.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-sub">
                You haven&apos;t sat this one yet.
              </li>
            )}
          </ul>

          <div className="border-t border-border-soft p-5">
            {canSit ? (
              <Button
                type="button"
                onClick={() => {
                  setJustMarked(null);
                  setSitting(true);
                }}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                {past.length > 0 ? "Try again" : "Start the quiz"}
              </Button>
            ) : (
              <p className="text-sm text-sub">{whyNot}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/student/quizzes"
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
      <dd className="font-heading mt-1 text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
