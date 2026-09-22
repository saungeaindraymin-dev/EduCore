"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/StatusPill";
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
import { usersApi } from "@/lib/api/users";
import { formatDateTime } from "@/lib/dates";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

// Oversight only: an admin can take work down or reopen it, never rewrite it
const STATUS_ACTION: Record<
  AssignmentStatus,
  { label: string; next: AssignmentStatus; className: string }
> = {
  draft: { label: "Publish", next: "published", className: "text-success" },
  published: { label: "Unpublish", next: "draft", className: "text-warning" },
  closed: { label: "Reopen", next: "published", className: "text-success" },
};

export default function AdminAssignmentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AssignmentStatus>("all");
  const [courseId, setCourseId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [page, setPage] = useState(1);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const courseFilter = useApiQuery("admin-assignments:courses", () =>
    coursesApi.list({ pageSize: 100 }),
  );
  const teacherFilter = useApiQuery("admin-assignments:teachers", () =>
    usersApi.list({ role: "teacher", pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    courseId: courseId === "all" ? undefined : courseId,
    teacherId: teacherId === "all" ? undefined : teacherId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `admin-assignments:${JSON.stringify(params)}`,
    () => assignmentsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Assignments</h1>
        <p className="mt-1 text-sm text-sub">
          Course work across the institute. Teachers write and grade it — you can take
          something down, reopen it, or remove it.
        </p>
      </header>

      <div className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
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
            <option value="all">All courses</option>
            {courseFilter.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} — {c.code}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by teacher"
            value={teacherId}
            onChange={(e) => {
              setTeacherId(e.target.value);
              setPage(1);
            }}
            className={filterClass}
          >
            <option value="all">All teachers</option>
            {teacherFilter.data?.data.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
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
            {isLoading && !data
              ? "Loading…"
              : `${total} assignment${total === 1 ? "" : "s"}`}
          </span>
        </div>

        {(error || actionError) && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 bg-danger-bg px-6 py-3 text-sm text-danger"
          >
            <span>{error ? `Couldn't load assignments: ${error}` : actionError}</span>
            <button
              type="button"
              onClick={() => (error ? reload() : setActionError(null))}
              className="font-medium underline"
            >
              {error ? "Retry" : "Dismiss"}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
                <th className="px-6 py-3">Assignment</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Set by</th>
                <th className="px-6 py-3">Due</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-border-soft transition-opacity ${
                isLoading && data ? "opacity-60" : ""
              }`}
            >
              {isLoading &&
                !data &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={`skeleton-${i}`}>
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-9 animate-pulse rounded-lg bg-field" />
                    </td>
                  </tr>
                ))}

              {rows.map((a) => {
                const action = STATUS_ACTION[a.status];
                const busy = busyId === a.id;
                const due = a.dueAt ? new Date(a.dueAt) : null;
                const overdue = a.status === "published" && !!due && due < now;
                return (
                  <tr key={a.id} className="hover:bg-field/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{a.title}</p>
                      <p className="text-xs text-sub">{a.totalPoints} points</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{a.course.title}</p>
                      <p className="whitespace-nowrap text-xs text-sub">{a.course.code}</p>
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      {a.createdBy?.name ?? (
                        <span className="text-sub italic">Not recorded</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {due ? (
                        <span className={overdue ? "text-warning" : "text-ink-soft"}>
                          {formatDateTime(due)}
                        </span>
                      ) : (
                        <span className="text-sub">No deadline</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={a.status} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => changeStatus(a, action.next)}
                        disabled={busy}
                        className={`text-sm font-medium hover:underline disabled:opacity-50 ${action.className}`}
                      >
                        {busy ? "Saving…" : action.label}
                      </button>
                      {a.status === "published" && (
                        <>
                          <span className="mx-2 text-border-soft">|</span>
                          <button
                            type="button"
                            onClick={() => changeStatus(a, "closed")}
                            disabled={busy}
                            className="text-sm font-medium text-ink-soft hover:underline disabled:opacity-50"
                          >
                            Close
                          </button>
                        </>
                      )}
                      <span className="mx-2 text-border-soft">|</span>
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
                    </td>
                  </tr>
                );
              })}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-sub">
                    No assignments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete assignment?"
        confirmLabel="Delete assignment"
        description={
          deleteTarget && (
            <>
              This permanently removes <strong>{deleteTarget.title}</strong> from{" "}
              {deleteTarget.course.code}
              {deleteTarget.createdBy ? `, set by ${deleteTarget.createdBy.name}` : ""}.
              Tell the teacher — they can&apos;t get it back.
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
