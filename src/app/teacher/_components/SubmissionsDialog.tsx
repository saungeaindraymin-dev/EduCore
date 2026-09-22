"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assignmentsApi, type Assignment, type Submission } from "@/lib/api/assignments";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/dates";
import { initials } from "@/lib/utils";

/** What the class handed in, and where the teacher marks it. */
export function SubmissionsDialog({
  assignment,
  onClose,
  onGraded,
}: {
  assignment: Assignment | null;
  onClose: () => void;
  onGraded?: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = assignment ? `teacher-submissions:${assignment.id}` : "teacher-submissions:none";
  const { data, error: loadError, isLoading, reload } = useApiQuery(key, () =>
    assignment
      ? assignmentsApi.submissions(assignment.id)
      : Promise.resolve(null as never),
  );

  const rows = data?.data ?? [];
  const meta = data?.meta;

  const openMarking = (submission: Submission) => {
    setOpenId(submission.id);
    setScore(submission.score === null ? "" : String(submission.score));
    setFeedback(submission.feedback ?? "");
    setError(null);
  };

  const mark = async (submission: Submission) => {
    const value = Number(score);
    if (!Number.isInteger(value) || value < 0) {
      setError("Enter a whole number of points");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await assignmentsApi.grade(submission.id, {
        score: value,
        feedback: feedback.trim() || null,
      });
      setOpenId(null);
      reload();
      onGraded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the mark");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!assignment} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {assignment && (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{assignment.title}</DialogTitle>
              <DialogDescription>
                {assignment.course.code} · out of {assignment.totalPoints} points
              </DialogDescription>
            </DialogHeader>

            {meta && (
              <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border-soft bg-field/60 p-3 text-sm sm:grid-cols-4">
                <Stat label="Handed in" value={meta.submissions} />
                <Stat label="To mark" value={meta.awaitingMarking} />
                <Stat
                  label="Not handed in"
                  value={meta.notSubmitted ?? "—"}
                />
                <Stat
                  label="Average"
                  value={
                    meta.averageScore === null
                      ? "—"
                      : `${meta.averageScore}/${meta.totalPoints}`
                  }
                />
              </dl>
            )}

            {loadError && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                <span>Couldn&apos;t load the submissions: {loadError}</span>
                <button type="button" onClick={reload} className="font-medium underline">
                  Retry
                </button>
              </div>
            )}

            <ul className="max-h-96 divide-y divide-border-soft overflow-y-auto rounded-xl border border-border-soft">
              {isLoading &&
                !data &&
                Array.from({ length: 3 }, (_, i) => (
                  <li key={`skeleton-${i}`} className="p-4">
                    <div className="h-10 animate-pulse rounded-lg bg-field" />
                  </li>
                ))}

              {rows.map((submission) => {
                const marking = openId === submission.id;
                return (
                  <li key={submission.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {initials(submission.student.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {submission.student.name}
                        </p>
                        <p className="truncate text-xs text-sub">
                          {formatDateTime(new Date(submission.submittedAt))}
                          {submission.isLate && (
                            <span className="text-warning"> · late</span>
                          )}
                        </p>
                      </div>
                      {submission.score !== null ? (
                        <span className="shrink-0 text-sm font-semibold text-success">
                          {submission.score}/{assignment.totalPoints}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning">
                          To mark
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => (marking ? setOpenId(null) : openMarking(submission))}
                        className="shrink-0 text-sm font-medium text-brand-indigo hover:underline"
                      >
                        {marking ? "Close" : submission.score === null ? "Mark" : "Remark"}
                      </button>
                    </div>

                    {marking && (
                      <div className="mt-3 space-y-3 rounded-xl bg-field/60 p-3">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                          {submission.content}
                        </p>
                        {error && (
                          <p role="alert" className="text-sm text-danger">
                            {error}
                          </p>
                        )}
                        <div className="flex flex-wrap items-end gap-3">
                          <div className="w-28 space-y-1">
                            <label
                              htmlFor={`score-${submission.id}`}
                              className="text-xs font-medium text-ink"
                            >
                              Score
                            </label>
                            <Input
                              id={`score-${submission.id}`}
                              type="number"
                              min={0}
                              max={assignment.totalPoints}
                              value={score}
                              onChange={(e) => setScore(e.target.value)}
                            />
                          </div>
                          <div className="min-w-48 flex-1 space-y-1">
                            <label
                              htmlFor={`feedback-${submission.id}`}
                              className="text-xs font-medium text-ink"
                            >
                              Feedback <span className="text-sub">(optional)</span>
                            </label>
                            <Input
                              id={`feedback-${submission.id}`}
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              placeholder="What did they do well?"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => mark(submission)}
                            disabled={saving}
                            className="bg-brand-gradient text-white hover:opacity-90"
                          >
                            {saving ? "Saving…" : "Save mark"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}

              {data && !loadError && rows.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-sub">
                  Nobody has handed anything in yet.
                </li>
              )}
            </ul>

            <DialogFooter>
              <Button
                type="button"
                onClick={onClose}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-sub">{label}</dt>
      <dd className="font-heading mt-0.5 text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
