"use client";

import { useState } from "react";
import { StatCard } from "@/components/StatCard";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { quizzesApi } from "@/lib/api/quizzes";
import { formatDateTime } from "@/lib/dates";
import { initials } from "@/lib/utils";

/** Marks come from the API — every attempt is scored on submission, nothing to grade here. */
export function QuizResultsPanel({
  quizId,
  attemptsAllowed,
}: {
  quizId: string;
  attemptsAllowed: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, error, isLoading, reload } = useApiQuery(`quiz-results:${quizId}`, () =>
    quizzesApi.results(quizId),
  );

  const attempts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attempts"
          value={meta ? meta.attempts : "…"}
          icon={<NavIcon name="check-badge" />}
        />
        <StatCard
          label="Students"
          value={meta ? meta.students : "…"}
          icon={<NavIcon name="user-group" />}
        />
        <StatCard
          label="Average"
          value={meta?.averagePercentage === null ? "—" : `${meta?.averagePercentage ?? "…"}%`}
          icon={<NavIcon name="grid" />}
        />
        <StatCard
          label="Passing (50%+)"
          value={meta?.passRate === null ? "—" : `${meta?.passRate ?? "…"}%`}
          icon={<NavIcon name="clipboard-check" />}
        />
      </div>

      <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <header className="border-b border-border-soft p-5">
          <h2 className="font-heading text-lg font-semibold text-ink">Attempts</h2>
          <p className="text-xs text-sub">
            Marked automatically on submission. Averages use each student&apos;s best of{" "}
            {attemptsAllowed === 1 ? "their single attempt" : `${attemptsAllowed} attempts`}.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
          >
            <span>Couldn&apos;t load the results: {error}</span>
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
                <div className="h-10 animate-pulse rounded-lg bg-field" />
              </li>
            ))}

          {attempts.map((attempt) => {
            const open = expanded === attempt.id;
            const rightCount = attempt.answers.filter((a) => a.isCorrect).length;
            return (
              <li key={attempt.id}>
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : attempt.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-field/50"
                >
                  <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {initials(attempt.student.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {attempt.student.name}
                    </p>
                    <p className="truncate text-xs text-sub">
                      {formatDateTime(new Date(attempt.submittedAt))} · {rightCount} of{" "}
                      {attempt.answers.length} right
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={`font-heading text-lg font-bold ${
                        attempt.percentage >= 50 ? "text-success" : "text-danger"
                      }`}
                    >
                      {attempt.percentage}%
                    </p>
                    <p className="text-xs text-sub">
                      {attempt.score} / {attempt.maxScore}
                    </p>
                  </div>
                </button>

                {open && (
                  <ol className="space-y-1 border-t border-border-soft bg-field/40 px-5 py-3">
                    {attempt.answers.map((answer, index) => (
                      <li
                        key={answer.questionId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          aria-hidden
                          className={answer.isCorrect ? "text-success" : "text-danger"}
                        >
                          {answer.isCorrect ? "✓" : "✗"}
                        </span>
                        <span className="text-ink-soft">Question {index + 1}</span>
                        <span className="ml-auto text-xs text-sub">
                          {answer.awarded} / {answer.points}
                          {answer.chosenOptionIds.length === 0 && " · no answer"}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}

          {data && !error && attempts.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-sub">
              No one has sat this quiz yet. Marks appear here the moment they submit.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
