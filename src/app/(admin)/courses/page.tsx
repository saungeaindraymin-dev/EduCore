"use client";

import { useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import { Pagination } from "@/components/Pagination";
import { CourseFormModal } from "@/components/CourseFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  COURSE_CATEGORIES,
  coursesApi,
  type Course,
  type CourseCategory,
  type CourseStatus,
} from "@/lib/api/courses";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CourseStatus>("all");
  const [category, setCategory] = useState<"all" | CourseCategory>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    q: q || undefined,
    status: status === "all" ? undefined : status,
    category: category === "all" ? undefined : category,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    JSON.stringify(params),
    () => coursesApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openForm = (course: Course | null) => {
    setEditing(course);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (course: Course) => {
    setDeleteTarget(course);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await coursesApi.remove(deleteTarget.id);
    // Step back a page if we just removed its last row
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else reload();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">
            Course Management
          </h1>
          <p className="mt-1 text-sm text-sub">
            Create courses, assign teachers, and track enrollments.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + Create Course
        </Button>
      </header>

      <div className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <input
            type="search"
            aria-label="Search courses"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search title or code…"
            className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
          />
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | CourseStatus);
              setPage(1);
            }}
            className={filterClass}
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as "all" | CourseCategory);
              setPage(1);
            }}
            className={filterClass}
          >
            <option value="all">All categories</option>
            {COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-sub">
            {isLoading && !data ? "Loading…" : `${total} courses`}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
          >
            <span>Couldn&apos;t load courses: {error}</span>
            <button
              type="button"
              onClick={reload}
              className="font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
                <th className="px-6 py-3">Course</th>
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Students</th>
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

              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-field/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-ink">{c.title}</p>
                    <p className="text-xs text-sub">{c.code}</p>
                  </td>
                  <td className="px-6 py-4 text-ink-soft">
                    {c.teacher?.name ?? (
                      <span className="italic text-sub">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-ink-soft">{c.category}</td>
                  <td className="px-6 py-4 text-ink-soft">{c.students}</td>
                  <td className="px-6 py-4">
                    <StatusPill status={c.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openForm(c)}
                      className="text-sm font-medium text-brand-indigo hover:underline"
                    >
                      Edit
                    </button>
                    <span className="mx-2 text-border-soft">|</span>
                    <button
                      type="button"
                      onClick={() => askDelete(c)}
                      className="text-sm font-medium text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-sm text-sub"
                  >
                    No courses match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>

      <CourseFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        course={editing}
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete course?"
        confirmLabel="Delete course"
        description={
          deleteTarget && (
            <>
              This permanently removes <strong>{deleteTarget.title}</strong> (
              {deleteTarget.code})
              {deleteTarget.students > 0 &&
                ` and its ${deleteTarget.students} enrollment(s)`}
              .
            </>
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
