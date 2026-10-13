"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import {
  SubmissionFileList,
  fileBadge,
  formatBytes,
} from "@/components/SubmissionFileList";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { SkeletonPage } from "@/components/Skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  MAX_SUBMISSION_FILES,
  MAX_SUBMISSION_FILE_BYTES,
  SUBMISSION_FILE_TYPES,
  assignmentsApi,
  type Submission,
} from "@/lib/api/assignments";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/dates";

const CONTENT_MAX = 50_000;

export default function StudentAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  // Files picked but not handed in yet, and handed-in files marked to go
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  // The hand-in response is the newest truth — using it avoids a flash of the old or empty
  // state while the list re-fetches
  const [latest, setLatest] = useState<Submission | null>(null);

  const { data, error, isLoading, reload } = useApiQuery(`student-assignment:${id}`, () =>
    assignmentsApi.get(id),
  );
  const assignment = data?.data;

  const submissions = useApiQuery(`student-submission:${id}`, () =>
    assignmentsApi.submissions(id),
  );
  const mine = latest ?? submissions.data?.data[0];

  if (isLoading && !assignment) {
    return (
      <div className="space-y-6">
        <BackLink />
        <SkeletonPage />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-2xl border border-border-soft bg-surface px-6 py-12 text-center shadow-sm">
          <h1 className="font-heading text-xl font-semibold text-ink">
            You can&apos;t open this assignment
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

  const due = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const overdue = assignment.status === "published" && !!due && due < now;
  const marked = !!mine?.gradedAt;
  const canHandIn = assignment.status === "published" && !marked;
  // Start from what they handed in, so "edit" keeps their text and files
  const text = draft ?? mine?.content ?? "";
  const handedInFiles = mine?.files ?? [];
  const keptFiles = handedInFiles.filter((file) => !removed.has(file.id));
  const fileCount = keptFiles.length + newFiles.length;
  const hasWork = text.trim().length > 0 || fileCount > 0;
  const changed = draft !== null || newFiles.length > 0 || removed.size > 0;

  // Check here what the API checks, so a mistake shows before anything is sent
  const addFiles = (picked: FileList | null) => {
    setFileError(null);
    setJustSaved(false);
    const accepted = SUBMISSION_FILE_TYPES.split(",");
    const incoming = Array.from(picked ?? []);
    for (const file of incoming) {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!accepted.includes(ext)) {
        setFileError(`"${file.name}" isn't a type you can hand in.`);
        return;
      }
      if (file.size > MAX_SUBMISSION_FILE_BYTES) {
        setFileError(`"${file.name}" is over ${MAX_SUBMISSION_FILE_BYTES / 1024 / 1024} MB.`);
        return;
      }
    }
    if (fileCount + incoming.length > MAX_SUBMISSION_FILES) {
      setFileError(`You can hand in at most ${MAX_SUBMISSION_FILES} files.`);
      return;
    }
    setNewFiles((prev) => [...prev, ...incoming]);
  };

  const resetChanges = () => {
    setDraft(null);
    setNewFiles([]);
    setRemoved(new Set());
    setFileError(null);
  };

  const handIn = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await assignmentsApi.submit(assignment.id, {
        content: text,
        files: newFiles,
        keepFileIds: keptFiles.map((file) => file.id),
      });
      setLatest(data);
      resetChanges();
      setJustSaved(true);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Could not hand your work in",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <header className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-ink sm:text-3xl">
                {assignment.title}
              </h1>
              {assignment.status === "closed" && <StatusPill status="closed" />}
            </div>
            <p className="mt-1 text-sm text-sub">
              <Link
                href={`/student/courses/${assignment.course.id}`}
                className="hover:text-brand-indigo hover:underline"
              >
                {assignment.course.code} · {assignment.course.title}
              </Link>
              {assignment.createdBy ? ` · ${assignment.createdBy.name}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`text-sm font-semibold ${overdue ? "text-danger" : "text-ink"}`}
            >
              {due ? formatDateTime(due) : "No deadline"}
            </p>
            <p className="text-xs text-sub">
              {overdue ? "Deadline passed" : "Due"} · {assignment.totalPoints} points
            </p>
          </div>
        </div>

        {assignment.description && (
          <div className="mt-5 border-t border-border-soft pt-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-sub">
              Instructions
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {assignment.description}
            </p>
          </div>
        )}
      </header>

      {/* The mark, once the teacher has been through it */}
      {marked && mine && (
        <section className="rounded-2xl border border-success/30 bg-success-bg p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-success">Marked</h2>
              <p className="text-xs text-success/80">
                {mine.gradedBy ? `${mine.gradedBy.name} · ` : ""}
                {mine.gradedAt ? formatDateTime(new Date(mine.gradedAt)) : ""}
              </p>
            </div>
            <p className="font-heading text-2xl font-bold text-success">
              {mine.score} / {assignment.totalPoints}
            </p>
          </div>
          {mine.feedback && (
            <p className="mt-3 whitespace-pre-line border-t border-success/20 pt-3 text-sm text-success">
              {mine.feedback}
            </p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft p-5">
          <div>
            <h2 className="font-heading text-lg font-semibold text-ink">Your work</h2>
            <p className="text-xs text-sub">
              {marked
                ? "Marked — ask your teacher if you need to change it."
                : mine
                  ? `Handed in ${formatDateTime(new Date(mine.submittedAt))}${
                      mine.isLate ? " · late" : ""
                    }. You can replace it until it's marked.`
                  : assignment.status === "published"
                    ? "Write your answer, attach files, or both — then hand it in."
                    : "This assignment is closed for submissions."}
            </p>
          </div>
          {mine && !marked && (
            <span className="rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info">
              Waiting to be marked
            </span>
          )}
        </header>

        <div className="space-y-3 p-5">
          {saveError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {saveError}
            </div>
          )}
          {justSaved && !saveError && (
            <div
              role="status"
              className="rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success"
            >
              Handed in. Your teacher will see it straight away.
            </div>
          )}

          {canHandIn ? (
            <>
              {overdue && (
                <p className="text-sm text-warning">
                  The deadline has passed — anything you hand in now is marked late.
                </p>
              )}
              <div className="flex items-baseline justify-between">
                <label htmlFor="content" className="text-sm font-medium text-ink">
                  Your answer
                </label>
                <span className="text-xs text-sub">
                  {text.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}
                </span>
              </div>
              <textarea
                id="content"
                rows={8}
                value={text}
                maxLength={CONTENT_MAX}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setJustSaved(false);
                }}
                placeholder="Write your answer here…"
                className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
              />

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">Files</p>
                  <span className="text-xs text-sub">
                    {fileCount} / {MAX_SUBMISSION_FILES} · up to{" "}
                    {MAX_SUBMISSION_FILE_BYTES / 1024 / 1024} MB each · PDF, Word, PowerPoint,
                    Excel, text, ZIP or images
                  </span>
                </div>

                {mine && (
                  <SubmissionFileList
                    submissionId={mine.id}
                    files={handedInFiles}
                    removed={removed}
                    onToggleRemove={(fileId) => {
                      setJustSaved(false);
                      setRemoved((prev) => {
                        const next = new Set(prev);
                        if (next.has(fileId)) next.delete(fileId);
                        else next.add(fileId);
                        return next;
                      });
                    }}
                  />
                )}

                {newFiles.length > 0 && (
                  <ul className="space-y-2">
                    {newFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-dashed border-brand-indigo/40 bg-indigo-50/40 px-3 py-2"
                      >
                        <span className="flex h-9 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold tracking-wide text-brand-indigo">
                          {fileBadge(file.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                          <p className="text-xs text-sub">
                            {formatBytes(file.size)} · ready to hand in
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={`Don't attach ${file.name}`}
                          className="shrink-0 rounded-lg px-2 py-1 text-sm text-sub hover:bg-field hover:text-danger"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <input
                  ref={picker}
                  type="file"
                  multiple
                  accept={SUBMISSION_FILE_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = ""; // so picking the same file again still fires
                  }}
                />
                <button
                  type="button"
                  onClick={() => picker.current?.click()}
                  disabled={fileCount >= MAX_SUBMISSION_FILES}
                  className="w-full rounded-xl border-2 border-dashed border-border-soft px-4 py-3 text-sm font-medium text-brand-indigo transition hover:border-brand-indigo/40 hover:bg-field/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Attach files
                </button>
                {fileError && (
                  <p role="alert" className="text-sm text-danger">
                    {fileError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handIn}
                  disabled={saving || !hasWork || (!!mine && !changed)}
                  className="bg-brand-gradient text-white hover:opacity-90"
                >
                  {saving ? "Sending…" : mine ? "Replace my work" : "Hand in"}
                </Button>
                {changed && mine && (
                  <button
                    type="button"
                    onClick={resetChanges}
                    className="text-sm font-medium text-sub hover:text-ink"
                  >
                    Undo changes
                  </button>
                )}
              </div>
            </>
          ) : mine ? (
            <div className="space-y-3">
              {mine.content && (
                <p className="whitespace-pre-line rounded-lg bg-field px-3 py-3 text-sm leading-relaxed text-ink-soft">
                  {mine.content}
                </p>
              )}
              <SubmissionFileList submissionId={mine.id} files={mine.files} />
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-sub">
              You didn&apos;t hand anything in for this one.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/student/assignments"
      className="inline-flex items-center gap-1 text-sm font-medium text-sub hover:text-brand-indigo"
    >
      ← Assignments
    </Link>
  );
}
