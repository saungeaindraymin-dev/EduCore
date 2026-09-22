"use client";

import Link from "next/link";
import { useState } from "react";
import { Pagination } from "@/components/Pagination";
import { NavIcon } from "@/components/shell/NavIcon";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  AUDIENCE_LABELS,
  announcementsApi,
  type Announcement,
  type AnnouncementAudience,
} from "@/lib/api/announcements";
import { enrollmentsApi } from "@/lib/api/enrollments";
import { formatDateTime } from "@/lib/dates";

const PAGE_SIZE = 10;
const LONG_BODY = 280; // characters before the body gets a "Read more" toggle
const NEW_FOR_DAYS = 7;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

// The only three a student ever receives; "teachers" posts are never in their scope
const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "students", label: "Students" },
  { value: "course", label: "A course" },
];

const AUDIENCE_CHIP: Record<string, string> = {
  all: "bg-info-bg text-info",
  students: "bg-violet-50 text-violet-600",
  course: "bg-success-bg text-success",
};

function audienceLabel(a: Announcement) {
  if (a.audience === "course") return a.course ? a.course.code : "Course";
  return AUDIENCE_LABELS[a.audience];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function StudentAnnouncementsPage() {
  const [query, setQuery] = useState("");
  // "any" (not "all") so it can't clash with the "all" audience value
  const [audience, setAudience] = useState<"any" | AnnouncementAudience>("any");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Fixed for this visit so the "New" badge doesn't shift between renders
  const [newSince] = useState(() => Date.now() - NEW_FOR_DAYS * 24 * 60 * 60 * 1000);

  const courses = useApiQuery("student-announcements:courses", () =>
    enrollmentsApi.list({ status: "active", pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API only returns published posts meant for this student
  const params = {
    q: q || undefined,
    audience: audience === "any" ? undefined : audience,
    courseId: courseId === "all" ? undefined : courseId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `student-announcements:${JSON.stringify(params)}`,
    () => announcementsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || audience !== "any" || courseId !== "all");

  const toggleBody = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-ink">Announcements</h1>
        <p className="mt-1 text-sm text-sub">
          News for you and for the courses you&apos;re on.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm">
        <input
          type="search"
          aria-label="Search announcements"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search title or text…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by audience"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value as "any" | AnnouncementAudience);
            setPage(1);
          }}
          className={filterClass}
        >
          <option value="any">Any audience</option>
          {AUDIENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
          <option value="all">All my courses</option>
          {courses.data?.data.map((enrollment) => (
            <option key={enrollment.course.id} value={enrollment.course.id}>
              {enrollment.course.title} — {enrollment.course.code}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : plural(total, "announcement")}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>Couldn&apos;t load your announcements: {error}</span>
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
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
              className="h-36 animate-pulse rounded-2xl border border-border-soft bg-surface"
            />
          ))}

        {rows.map((a) => {
          const isLong = a.body.length > LONG_BODY;
          const isOpen = expanded.has(a.id);
          const publishedAt = a.publishedAt ? new Date(a.publishedAt) : null;
          const isNew = !!publishedAt && publishedAt.getTime() > newSince;
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
                    {isNew && (
                      <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-xs font-semibold text-white">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {publishedAt ? formatDateTime(publishedAt) : "Not published"}
                    {a.author ? ` · ${a.author.name}` : ""}
                    {a.audience === "course" && a.course ? (
                      <>
                        {" · "}
                        <Link
                          href={`/student/courses/${a.course.id}`}
                          className="hover:text-brand-indigo hover:underline"
                        >
                          {a.course.title}
                        </Link>
                      </>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    AUDIENCE_CHIP[a.audience] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {audienceLabel(a)}
                </span>
              </div>

              <p
                className={`mt-3 whitespace-pre-line text-sm text-ink-soft ${
                  isLong && !isOpen ? "line-clamp-4" : ""
                }`}
              >
                {a.body}
              </p>

              {isLong && (
                <button
                  type="button"
                  onClick={() => toggleBody(a.id)}
                  aria-expanded={isOpen}
                  className="mt-2 text-sm font-medium text-brand-indigo hover:underline"
                >
                  {isOpen ? "Show less" : "Read more"}
                </button>
              )}
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-field text-sub">
              <NavIcon name="megaphone" />
            </div>
            <p className="mt-3 text-sm text-sub">
              {filtered
                ? "No announcements match your filters."
                : "Nothing has been announced for you yet."}
            </p>
          </li>
        )}
      </ul>

      {total > PAGE_SIZE && (
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-surface shadow-sm [&>div]:border-t-0">
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
