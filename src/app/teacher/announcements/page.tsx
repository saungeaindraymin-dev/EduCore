"use client";

import { useState } from "react";
import { AnnouncementFormModal } from "@/components/AnnouncementFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pagination } from "@/components/Pagination";
import { StatusPill } from "@/components/StatusPill";
import { NavIcon } from "@/components/shell/NavIcon";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  AUDIENCE_LABELS,
  announcementsApi,
  type Announcement,
  type AnnouncementAudience,
} from "@/lib/api/announcements";
import { coursesApi } from "@/lib/api/courses";
import { formatDateTime } from "@/lib/dates";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 10;
const LONG_BODY = 280; // characters before the body gets a "Read more" toggle
const NEW_FOR_DAYS = 7;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

// Teachers only ever receive these three; "students" posts are never in their scope
const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "teachers", label: "Teachers" },
  { value: "course", label: "A course" },
];

const AUDIENCE_CHIP: Record<string, string> = {
  all: "bg-info-bg text-info",
  teachers: "bg-violet-50 text-violet-600",
  course: "bg-success-bg text-success",
};

function audienceLabel(a: Announcement) {
  if (a.audience === "course") return a.course ? a.course.code : "Course";
  return AUDIENCE_LABELS[a.audience];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function TeacherAnnouncementsPage() {
  const teacherId = useAuthStore((s) => s.user?.id) ?? "";

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const [query, setQuery] = useState("");
  // "any" (not "all") so it can't clash with the "all" audience value
  const [audience, setAudience] = useState<"any" | AnnouncementAudience>("any");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Fixed for this visit so the "New" badge doesn't shift between renders
  const [newSince] = useState(
    () => Date.now() - NEW_FOR_DAYS * 24 * 60 * 60 * 1000,
  );

  const courseFilter = useApiQuery(`teacher-announcements:courses:${teacherId}`, () =>
    coursesApi.list({ teacherId, pageSize: 100 }),
  );

  const q = useDebouncedValue(query.trim(), 300);
  // The API only returns published posts meant for this teacher
  const params = {
    q: q || undefined,
    audience: audience === "any" ? undefined : audience,
    courseId: courseId === "all" ? undefined : courseId,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    `teacher-announcements:${JSON.stringify(params)}`,
    () => announcementsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || audience !== "any" || courseId !== "all");

  const openForm = (announcement: Announcement | null) => {
    setEditing(announcement);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (announcement: Announcement) => {
    setDeleteTarget(announcement);
    setDeleteOpen(true);
  };

  const toggleBody = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Announcements</h1>
          <p className="mt-1 text-sm text-sub">
            Posts for you, plus the ones you write for your own courses.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + New Announcement
        </Button>
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
          {courseFilter.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} — {c.code}
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
          <span>Couldn&apos;t load announcements: {error}</span>
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
          const isMine = a.author?.id === teacherId;
          const isNew = !isMine && !!publishedAt && publishedAt.getTime() > newSince;
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
                    {isMine && a.status !== "published" && <StatusPill status={a.status} />}
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {timingLabel(a, publishedAt)}
                    {isMine ? " · by you" : a.author ? ` · ${a.author.name}` : ""}
                    {a.audience === "course" && a.course ? ` · ${a.course.title}` : ""}
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

              <div className="mt-2 flex flex-wrap items-center gap-4">
                {isLong && (
                  <button
                    type="button"
                    onClick={() => toggleBody(a.id)}
                    aria-expanded={isOpen}
                    className="text-sm font-medium text-brand-indigo hover:underline"
                  >
                    {isOpen ? "Show less" : "Read more"}
                  </button>
                )}
                {isMine && (
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
                      onClick={() => askDelete(a)}
                      className="text-sm font-medium text-danger hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
            {!filtered && (
              <button
                type="button"
                onClick={() => openForm(null)}
                className="mt-2 text-sm font-medium text-brand-indigo hover:underline"
              >
                Write one for your course
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

      <AnnouncementFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
        teacherId={teacherId}
        onSaved={() => reload()}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete announcement?"
        confirmLabel="Delete announcement"
        description={
          deleteTarget && (
            <>
              This removes <strong>{deleteTarget.title}</strong> from the course feed.
            </>
          )
        }
        onConfirm={async () => {
          if (!deleteTarget) return;
          await announcementsApi.remove(deleteTarget.id);
          reload();
        }}
      />
    </div>
  );
}

function timingLabel(a: Announcement, publishedAt: Date | null) {
  if (!publishedAt) return "Draft";
  return a.status === "scheduled"
    ? `Scheduled for ${formatDateTime(publishedAt)}`
    : formatDateTime(publishedAt);
}
