"use client";

import { useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import { Pagination } from "@/components/Pagination";
import { AnnouncementFormModal } from "@/components/AnnouncementFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  AUDIENCE_LABELS,
  announcementsApi,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementStatus,
} from "@/lib/api/announcements";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/dates";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

function audienceLabel(a: Announcement) {
  if (a.audience === "course" && a.course) return `${a.course.code} · ${a.course.title}`;
  return AUDIENCE_LABELS[a.audience];
}

function timingLabel(a: Announcement) {
  if (a.status === "draft" || !a.publishedAt) {
    return `Draft · edited ${formatDateTime(new Date(a.updatedAt))}`;
  }
  const when = formatDateTime(new Date(a.publishedAt));
  return a.status === "scheduled" ? `Scheduled for ${when}` : `Published ${when}`;
}

export default function AnnouncementsPage() {
  const [query, setQuery] = useState("");
  // "any" (not "all") so it can't clash with the "all" audience value
  const [status, setStatus] = useState<"any" | AnnouncementStatus>("any");
  const [audience, setAudience] = useState<"any" | AnnouncementAudience>("any");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    q: q || undefined,
    status: status === "any" ? undefined : status,
    audience: audience === "any" ? undefined : audience,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    JSON.stringify(params),
    () => announcementsApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(q || status !== "any" || audience !== "any");

  const openForm = (announcement: Announcement | null) => {
    setEditing(announcement);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (announcement: Announcement) => {
    setDeleteTarget(announcement);
    setDeleteOpen(true);
  };

  const setPublished = async (announcement: Announcement, publish: boolean) => {
    setBusyId(announcement.id);
    setActionError(null);
    try {
      await announcementsApi.update(announcement.id, {
        publishedAt: publish ? new Date().toISOString() : null,
      });
      reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not update the announcement",
      );
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await announcementsApi.remove(deleteTarget.id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else reload();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Announcements</h1>
          <p className="mt-1 text-sm text-sub">
            Share news with everyone, a role, or a single course.
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
          placeholder="Search title or message…"
          className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as "any" | AnnouncementStatus);
            setPage(1);
          }}
          className={filterClass}
        >
          <option value="any">All statuses</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Draft</option>
        </select>
        <select
          aria-label="Filter by audience"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value as "any" | AnnouncementAudience);
            setPage(1);
          }}
          className={filterClass}
        >
          <option value="any">All audiences</option>
          <option value="all">Everyone</option>
          <option value="teachers">Teachers</option>
          <option value="students">Students</option>
          <option value="course">Course</option>
        </select>
        <span className="ml-auto text-sm text-sub">
          {isLoading && !data ? "Loading…" : `${total} announcements`}
        </span>
      </div>

      {(error || actionError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
        >
          <span>{error ? `Couldn't load announcements: ${error}` : actionError}</span>
          <button
            type="button"
            onClick={error ? reload : () => setActionError(null)}
            className="font-medium underline"
          >
            {error ? "Retry" : "Dismiss"}
          </button>
        </div>
      )}

      <ul
        className={`space-y-3 transition-opacity ${isLoading && data ? "opacity-60" : ""}`}
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
          return (
            <li
              key={a.id}
              className="rounded-2xl border border-border-soft bg-surface p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-heading text-lg font-semibold text-ink">
                      {a.title}
                    </h2>
                    <StatusPill status={a.status} />
                    <span className="inline-flex items-center rounded-full bg-field px-2.5 py-0.5 text-xs font-medium text-ink-soft ring-1 ring-border-soft">
                      {audienceLabel(a)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-sub">
                    {a.author ? `${a.author.name} · ` : ""}
                    {timingLabel(a)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => setPublished(a, a.status !== "published")}
                    disabled={busy}
                    className={`font-medium hover:underline disabled:opacity-50 ${
                      a.status === "published" ? "text-warning" : "text-success"
                    }`}
                  >
                    {busy
                      ? "Saving…"
                      : a.status === "published"
                        ? "Unpublish"
                        : "Publish now"}
                  </button>
                  <span className="mx-2 text-border-soft">|</span>
                  <button
                    type="button"
                    onClick={() => openForm(a)}
                    className="font-medium text-brand-indigo hover:underline"
                  >
                    Edit
                  </button>
                  <span className="mx-2 text-border-soft">|</span>
                  <button
                    type="button"
                    onClick={() => askDelete(a)}
                    className="font-medium text-danger hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-ink-soft">
                {a.body}
              </p>
            </li>
          );
        })}

        {!isLoading && !error && rows.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border-soft bg-surface px-6 py-12 text-center">
            <p className="text-sm text-sub">
              {filtered
                ? "No announcements match your filters."
                : "No announcements yet."}
            </p>
            {!filtered && (
              <button
                type="button"
                onClick={() => openForm(null)}
                className="mt-2 text-sm font-medium text-brand-indigo hover:underline"
              >
                Write the first one
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
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete announcement?"
        confirmLabel="Delete announcement"
        description={
          deleteTarget && (
            <>
              This permanently deletes <strong>{deleteTarget.title}</strong>
              {deleteTarget.status === "published" &&
                ". People who could see it won't anymore"}
              .
            </>
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
