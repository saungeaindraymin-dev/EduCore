"use client";

import { useState } from "react";
import { AssignmentFormModal } from "../_components/AssignmentFormModal";
import { SubmissionsDialog } from "../_components/SubmissionsDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  assignmentsApi,
  type Assignment,
  type AssignmentStatus,
} from "@/lib/api/assignments";
import { ApiError } from "@/lib/api/client";
import { coursesApi } from "@/lib/api/courses";
import { formatDateTime } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Due in 3 days", "Due today", "Overdue by 2 days" — or no deadline at all */
function dueLabel(assignment: Assignment, now: Date) {
  if (!assignment.dueAt) return "No deadline";
  const due = new Date(assignment.dueAt);
  const days = Math.round((due.getTime() - now.getTime()) / 86_400_000);
  const when = formatDateTime(due);
  if (assignment.status === "closed") return `Closed · was due ${when}`;
  if (days < 0) return `Overdue · was due ${when}`;
  if (days === 0) return `Due today · ${when}`;
  if (days === 1) return `Due tomorrow · ${when}`;
  return `Due in ${days} days · ${when}`;
}

export default function TeacherAssignmentsPage() {
  const teacherId = useAuthStore((s) => s.user?.id) ?? "";

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AssignmentStatus>("all");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [marking, setMarking] = useState<Assignment | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const courseFilter = useApiQuery(`teacher-assignments:courses:${teacherId}`, () =>
    coursesApi.list({ teacherId, pageSize: 100 }),
  );
  const teachableCourses = (courseFilter.data?.data ?? []).filter(
    (c) => c.status !== "inactive",
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API already limits a teacher to the courses they teach
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    courseId: courseId === "all" ? undefined : courseId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `teacher-assignments:${JSON.stringify(params)}`,
    () => assignmentsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || status !== "all" || courseId !== "all");

  const openForm = (assignment: Assignment | null) => {
    setEditing(assignment);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const changeStatus = async (assignment: Assignment, next: AssignmentStatus) => {
    setBusyId(assignment.id);
    setActionError(null);
    try {
      await assignmentsApi.update(assignment.id, { status: next });
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not update the assignment",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Assignments</h1>
          <p className="mt-1 text-sm text-sub">
            Work you set for the courses you teach.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          disabled={teachableCourses.length === 0}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + New Assignment
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search assignments"
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
            setStatus(e.target.value as "all" | AssignmentStatus);
            setPage(1);
          }}
          className={filterClass}
        >
          <option value="all">All statuses</option>
          {ASSIGNMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ASSIGNMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(total, "assignment")}
        </span>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>
            {error ? `Couldn't load your assignments: ${error}` : actionError}
          </span>
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

        {rows.map((a) => {
          const busy = busyId === a.id;
          const overdue =
            a.status === "published" && !!a.dueAt && new Date(a.dueAt) < now;
          return (
            <li
              key={a.id}
              className="rounded-2xl border border-border-soft bg-surface p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-ink">
                      {a.title}
                    </h2>
                    <StatusPill status={a.status} />
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {a.course.code} · {a.course.title} · {a.totalPoints} points
                  </p>
                </div>
                <p
                  className={`shrink-0 text-xs font-medium ${
                    overdue ? "text-warning" : "text-sub"
                  }`}
                >
                  {dueLabel(a, now)}
                </p>
              </div>

              {a.description && (
                <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-ink-soft">
                  {a.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setMarking(a)}
                  className="text-sm font-medium text-brand-indigo hover:underline"
                >
                  Submissions
                </button>
                {a.status !== "published" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(a, "published")}
                    disabled={busy}
                    className="text-sm font-medium text-success hover:underline disabled:opacity-50"
                  >
                    {busy ? "Saving…" : a.status === "draft" ? "Publish" : "Reopen"}
                  </button>
                )}
                {a.status === "published" && (
                  <button
                    type="button"
                    onClick={() => changeStatus(a, "closed")}
                    disabled={busy}
                    className="text-sm font-medium text-warning hover:underline disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Close"}
                  </button>
                )}
                <div className="ml-auto flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => openForm(a)}
                    className="text-sm font-medium text-brand-indigo hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget(a);
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
                ? "No assignments match your filters."
                : teachableCourses.length === 0
                  ? "You need an active course before you can set assignments."
                  : "You haven't set any assignments yet."}
            </p>
            {!filtered && teachableCourses.length > 0 && (
              <button
                type="button"
                onClick={() => openForm(null)}
                className="mt-2 text-sm font-medium text-brand-indigo hover:underline"
              >
                Set your first assignment
              </button>
            )}
          </li>
        )}
      </ul>

      {total > PAGE_SIZE && (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm [&>div]:border-t-0">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}

      <AssignmentFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        assignment={editing}
        teacherId={teacherId}
        defaultCourseId={courseId === "all" ? undefined : courseId}
        onSaved={() => reload()}
      />

      <SubmissionsDialog
        assignment={marking}
        onClose={() => setMarking(null)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete assignment?"
        confirmLabel="Delete assignment"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.title}</strong> from{" "}
              {deleteTarget.course.code}.
            </>
          )
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await assignmentsApi.remove(deleteTarget.id);
          reload();
        }}
      />
    </div>
  );
}
