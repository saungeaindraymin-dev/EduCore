"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ApiError } from "@/lib/api/client";
import { lessonsApi, type Lesson } from "@/lib/api/lessons";
import { LessonFormModal } from "./LessonFormModal";

export function LessonsPanel({
  courseId,
  onCountChanged,
}: {
  courseId: string;
  onCountChanged: () => void;
}) {
  const { data, error, isLoading, reload } = useApiQuery(`lessons:${courseId}`, () =>
    lessonsApi.list(courseId),
  );
  const lessons = data?.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openForm = (lesson: Lesson | null) => {
    setEditing(lesson);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, delta: -1 | 1) => {
    const ids = lessons.map((lesson) => lesson.id);
    const target = index + delta;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return run(() => lessonsApi.reorder(courseId, ids), "Could not reorder the lessons");
  };

  const togglePublished = (lesson: Lesson) =>
    run(
      () => lessonsApi.update(courseId, lesson.id, { published: !lesson.published }),
      "Could not update the lesson",
    );

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">Lessons</h2>
          <p className="text-xs text-sub">
            Enrolled students see published lessons, in this order.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + Add lesson
        </Button>
      </header>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>{error ? `Couldn't load lessons: ${error}` : actionError}</span>
          <button
            type="button"
            onClick={error ? reload : () => setActionError(null)}
            className="font-medium underline"
          >
            {error ? "Retry" : "Dismiss"}
          </button>
        </div>
      )}

      <ol
        className={`divide-y divide-border-soft transition-opacity ${
          busy || (isLoading && data) ? "opacity-60" : ""
        }`}
      >
        {isLoading &&
          !data &&
          Array.from({ length: 3 }, (_, i) => (
            <li key={`skeleton-${i}`} className="p-5">
              <div className="h-12 animate-pulse rounded-lg bg-field" />
            </li>
          ))}

        {lessons.map((lesson, index) => (
          <li key={lesson.id} className="flex flex-wrap items-start gap-4 p-5 sm:flex-nowrap">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-brand-indigo">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink">{lesson.title}</h3>
                <StatusPill status={lesson.published ? "published" : "draft"} />
              </div>
              {lesson.content ? (
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-ink-soft">
                  {lesson.content}
                </p>
              ) : (
                <p className="mt-1 text-sm italic text-sub">No content yet</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 text-sm">
              <ArrowButton
                direction="up"
                label={`Move "${lesson.title}" up`}
                disabled={busy || index === 0}
                onClick={() => move(index, -1)}
              />
              <ArrowButton
                direction="down"
                label={`Move "${lesson.title}" down`}
                disabled={busy || index === lessons.length - 1}
                onClick={() => move(index, 1)}
              />
              <span className="mx-1 text-border-soft">|</span>
              <button
                type="button"
                onClick={() => togglePublished(lesson)}
                disabled={busy}
                className={`font-medium hover:underline disabled:opacity-50 ${
                  lesson.published ? "text-warning" : "text-success"
                }`}
              >
                {lesson.published ? "Unpublish" : "Publish"}
              </button>
              <span className="mx-1 text-border-soft">|</span>
              <button
                type="button"
                onClick={() => openForm(lesson)}
                className="font-medium text-brand-indigo hover:underline"
              >
                Edit
              </button>
              <span className="mx-1 text-border-soft">|</span>
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(lesson);
                  setDeleteOpen(true);
                }}
                className="font-medium text-danger hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}

        {data && !error && lessons.length === 0 && (
          <li className="px-5 py-12 text-center">
            <p className="text-sm text-sub">This course has no lessons yet.</p>
            <button
              type="button"
              onClick={() => openForm(null)}
              className="mt-2 text-sm font-medium text-brand-indigo hover:underline"
            >
              Add the first lesson
            </button>
          </li>
        )}
      </ol>

      <LessonFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={courseId}
        lesson={editing}
        onSaved={() => {
          reload();
          if (!editing) onCountChanged();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lesson?"
        confirmLabel="Delete lesson"
        description={
          deleteTarget && (
            <>
              This permanently deletes <strong>{deleteTarget.title}</strong> and its content.
            </>
          )
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await lessonsApi.remove(courseId, deleteTarget.id);
          reload();
          onCountChanged();
        }}
      />
    </section>
  );
}

function ArrowButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-lg p-1.5 text-sub transition hover:bg-field hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-4 w-4"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === "up" ? "m4.5 15.75 7.5-7.5 7.5 7.5" : "m19.5 8.25-7.5 7.5-7.5-7.5"}
        />
      </svg>
    </button>
  );
}
