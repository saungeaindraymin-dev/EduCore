"use client";

import { useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import { Pagination } from "@/components/Pagination";
import { EnrollmentFormModal } from "../_components/EnrollmentFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ApiError } from "@/lib/api/client";
import { coursesApi } from "@/lib/api/courses";
import {
  ENROLLMENT_STATUSES,
  enrollmentsApi,
  type Enrollment,
  type EnrollmentStatus,
} from "@/lib/api/enrollments";
import { initials } from "@/lib/utils";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

// One-click status change shown per row
const QUICK_ACTION: Record<
  EnrollmentStatus,
  { label: string; next: EnrollmentStatus; className: string }
> = {
  active: { label: "Drop", next: "dropped", className: "text-warning" },
  pending: { label: "Approve", next: "active", className: "text-success" },
  dropped: { label: "Reactivate", next: "active", className: "text-success" },
};

export default function EnrollmentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EnrollmentStatus>("all");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Enrollment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const courseFilter = useApiQuery("enrollments:course-filter", () =>
    coursesApi.list({ pageSize: 100 }),
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
    JSON.stringify(params),
    () => enrollmentsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openForm = (enrollment: Enrollment | null) => {
    setEditing(enrollment);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (enrollment: Enrollment) => {
    setDeleteTarget(enrollment);
    setDeleteOpen(true);
  };

  const changeStatus = async (
    enrollment: Enrollment,
    next: EnrollmentStatus,
  ) => {
    setBusyId(enrollment.id);
    setActionError(null);
    try {
      await enrollmentsApi.update(enrollment.id, { status: next });
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not update the enrollment",
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await enrollmentsApi.remove(deleteTarget.id);
    // Step back a page if we just removed its last row
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else reload();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">
            Enrollments
          </h1>
          <p className="mt-1 text-sm text-sub">
            Enroll students, track their status, and move them between courses.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + Enroll Student
        </Button>
      </header>

      <div className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <input
            type="search"
            aria-label="Search enrollments"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search student or course…"
            className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | EnrollmentStatus);
              setPage(1);
            }}
            className={`${filterClass} capitalize`}
          >
            <option value="all">All statuses</option>
            {ENROLLMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
          <span className="ml-auto text-sm text-sub">
            {isLoading && !data ? "Loading…" : `${total} enrollments`}
          </span>
        </div>

        {(error || actionError) && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
          >
            <span>
              {error ? `Couldn't load enrollments: ${error}` : actionError}
            </span>
            {error ? (
              <button
                type="button"
                onClick={reload}
                className="font-medium underline"
              >
                Retry
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="font-medium underline"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Enrolled</th>
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
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-9 animate-pulse rounded-lg bg-field" />
                    </td>
                  </tr>
                ))}

              {rows.map((e) => {
                const quick = QUICK_ACTION[e.status];
                const busy = busyId === e.id;
                return (
                  <tr key={e.id} className="hover:bg-field/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                          {initials(e.student.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">
                            {e.student.name}
                          </p>
                          <p className="text-xs text-sub">{e.student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink">{e.course.title}</p>
                      <p className="text-xs text-sub">{e.course.code}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={e.status} />
                    </td>
                    <td className="px-6 py-4 text-ink-soft">
                      {e.enrolledAt.slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => changeStatus(e, quick.next)}
                        disabled={busy}
                        className={`text-sm font-medium hover:underline disabled:opacity-50 ${quick.className}`}
                      >
                        {busy ? "Saving…" : quick.label}
                      </button>
                      <span className="mx-2 text-border-soft">|</span>
                      <button
                        type="button"
                        onClick={() => openForm(e)}
                        className="text-sm font-medium text-brand-indigo hover:underline"
                      >
                        Edit
                      </button>
                      <span className="mx-2 text-border-soft">|</span>
                      <button
                        type="button"
                        onClick={() => askDelete(e)}
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
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-sub"
                  >
                    No enrollments match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>

      <EnrollmentFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        enrollment={editing}
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete enrollment?"
        confirmLabel="Delete enrollment"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.student.name}</strong> from{" "}
              <strong>{deleteTarget.course.title}</strong> (
              {deleteTarget.course.code}) permanently. To keep a record, drop
              the enrollment instead.
            </>
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
