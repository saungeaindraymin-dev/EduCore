"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import {
  QUESTION_TYPE_LABELS,
  quizzesApi,
  type MarkedAttempt,
  type QuizDetail,
} from "@/lib/api/quizzes";

type Answers = Record<string, string[]>;

/**
 * Sitting the quiz. Answers live here until they're sent; the API marks the attempt and
 * sends back the result, so nothing is scored in the browser.
 */
export function QuizRunner({
  quiz,
  onFinished,
}: {
  quiz: QuizDetail;
  onFinished: (attempt: MarkedAttempt) => void;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A fixed end time beats counting seconds: the clock stays honest if the tab sleeps
  const [endsAt] = useState(() =>
    quiz.timeLimitMinutes ? Date.now() + quiz.timeLimitMinutes * 60_000 : null,
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null,
  );
  // Guards the timer's auto-submit so it can't fire twice
  const sentRef = useRef(false);

  const answeredCount = Object.values(answers).filter((ids) => ids.length > 0).length;

  const submit = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    setSending(true);
    setError(null);
    try {
      const { data } = await quizzesApi.submitAttempt(
        quiz.id,
        quiz.questions.map((question) => ({
          questionId: question.id,
          optionIds: answers[question.id] ?? [],
        })),
      );
      onFinished(data);
    } catch (err) {
      sentRef.current = false;
      setError(err instanceof ApiError ? err.message : "Could not hand in your answers");
    } finally {
      setSending(false);
    }
  }, [answers, quiz, onFinished]);

  // Keep the latest submit reachable from the timer without restarting it every keystroke
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // Countdown, and hand in automatically when it runs out. This is a courtesy for the
  // student — the API doesn't enforce the limit.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    }, 1000);
    const autoSubmit = setTimeout(
      () => submitRef.current(),
      Math.max(0, endsAt - Date.now()),
    );
    return () => {
      clearInterval(tick);
      clearTimeout(autoSubmit);
    };
  }, [endsAt]);

  const choose = (questionId: string, optionId: string, multiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      if (!multiple) return { ...prev, [questionId]: [optionId] };
      return {
        ...prev,
        [questionId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const clock =
    secondsLeft === null
      ? null
      : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const lowOnTime = secondsLeft !== null && secondsLeft <= 60;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <p className="text-sm text-sub">
          Answered <strong className="text-ink">{answeredCount}</strong> of{" "}
          {quiz.questions.length}
        </p>
        {clock && (
          <p
            role="timer"
            aria-live="off"
            className={`font-heading text-lg font-bold ${
              lowOnTime ? "text-danger" : "text-ink"
            }`}
          >
            {clock}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((question, index) => {
          const multiple = question.type === "multiple";
          const chosen = answers[question.id] ?? [];
          return (
            <li
              key={question.id}
              className="rounded-2xl border border-border-soft bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  {index + 1}. {question.text}
                </p>
                <span className="shrink-0 text-xs text-sub">
                  {question.points} {question.points === 1 ? "point" : "points"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-sub">
                {QUESTION_TYPE_LABELS[question.type]}
                {multiple ? " — tick everything that applies" : ""}
              </p>

              <ul className="mt-3 space-y-2">
                {question.options.map((option) => {
                  const picked = chosen.includes(option.id);
                  return (
                    <li key={option.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                          picked
                            ? "border-brand-indigo bg-indigo-50 font-medium text-brand-indigo"
                            : "border-border-soft bg-field text-ink hover:border-brand-indigo/40"
                        }`}
                      >
                        <input
                          type={multiple ? "checkbox" : "radio"}
                          name={question.id}
                          checked={picked}
                          onChange={() => choose(question.id, option.id, multiple)}
                          className="h-4 w-4 shrink-0 accent-brand-indigo"
                        />
                        {option.text}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <Button
          type="button"
          onClick={submit}
          disabled={sending}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          {sending ? "Marking…" : "Hand in and see my score"}
        </Button>
        <p className="text-sm text-sub">
          {answeredCount < quiz.questions.length
            ? `${quiz.questions.length - answeredCount} unanswered — they'll score zero.`
            : "All answered."}
        </p>
      </div>
    </div>
  );
}
