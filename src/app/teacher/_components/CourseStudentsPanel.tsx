"use client";

import { StatusPill } from "@/components/StatusPill";
import { useApiQuery } from "@/hooks/useApiQuery";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { initials } from "@/lib/utils";

const LIMIT = 100;

export function CourseStudentsPanel({ courseId }: { courseId: string }) {
  const { data, error, isLoading, reload } = useApiQuery(`course-students:${courseId}`, () =>
    enrollmentsApi.list({ courseId, pageSize: LIMIT }),
  );
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <section className="rounded-2xl border border-border-soft bg-surface shadow-sm">
      <header className="border-b border-border-soft p-5">
        <h2 className="font-heading text-lg font-semibold text-ink">Students</h2>
        <p className="text-xs text-sub">
          {data ? `${total} enrolled` : "Loading…"} · Enrollments are managed by an administrator.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load students: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
              <th className="px-5 py-3">Student</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {isLoading &&
              !data &&
              Array.from({ length: 3 }, (_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={3} className="px-5 py-4">
                    <div className="h-9 animate-pulse rounded-lg bg-field" />
                  </td>
                </tr>
              ))}
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                      {initials(e.student.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{e.student.name}</p>
                      <p className="text-xs text-sub">{e.student.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <StatusPill status={e.status} />
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  {new Date(e.enrolledAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {data && !error && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-sm text-sub">
                  No students are enrolled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {total > LIMIT && (
        <p className="border-t border-border-soft px-5 py-3 text-xs text-sub">
          Showing the first {LIMIT} of {total}.
        </p>
      )}
    </section>
  );
}
