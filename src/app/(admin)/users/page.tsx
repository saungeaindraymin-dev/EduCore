"use client";

import { useState } from "react";
import { StatusPill } from "@/components/StatusPill";
import { Pagination } from "@/components/Pagination";
import { UserFormModal } from "../_components/UserFormModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Role } from "@/lib/api/auth";
import { usersApi, type UserStatus, type UserSummary } from "@/lib/api/users";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

const PAGE_SIZE = 10;

const filterClass =
  "h-10 rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none";

export default function UsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);

  const q = useDebouncedValue(query.trim(), 300);
  const params = {
    q: q || undefined,
    role: role === "all" ? undefined : role,
    status: status === "all" ? undefined : status,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, error, isLoading, reload } = useApiQuery(
    JSON.stringify(params),
    () => usersApi.list(params),
  );

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openForm = (user: UserSummary | null) => {
    setEditing(user);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const askDelete = (user: UserSummary) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await usersApi.remove(deleteTarget.id);
    if (rows.length === 1 && page > 1) setPage(page - 1);
    else reload();
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">
            User Management
          </h1>
          <p className="mt-1 text-sm text-sub">
            Manage administrators, teachers, and students.
          </p>
        </div>
        <Button
          onClick={() => openForm(null)}
          className="bg-brand-gradient text-white hover:opacity-90"
        >
          + Add User
        </Button>
      </header>

      <div className="rounded-2xl border border-border-soft bg-surface shadow-sm">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border-soft p-4">
          <input
            type="search"
            aria-label="Search users"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or email…"
            className="h-10 w-full max-w-xs rounded-lg border border-border-soft bg-field px-3 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20"
          />
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as "all" | Role);
              setPage(1);
            }}
            className={filterClass}
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "all" | UserStatus);
              setPage(1);
            }}
            className={filterClass}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="ml-auto text-sm text-sub">
            {isLoading && !data ? "Loading…" : `${total} users`}
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 border-b border-danger/20 bg-danger-bg px-6 py-3 text-sm text-danger"
          >
            <span>Couldn&apos;t load users: {error}</span>
            <button
              type="button"
              onClick={reload}
              className="font-medium underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-soft bg-field text-left text-xs font-semibold uppercase tracking-wider text-sub">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Joined</th>
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

              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-field/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {u.name}
                          {u.id === currentUserId && (
                            <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-brand-indigo">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-sub">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-ink-soft">
                    {u.role}
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill status={u.status} />
                  </td>
                  <td className="px-6 py-4 text-ink-soft">
                    {u.createdAt.slice(0, 10)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => openForm(u)}
                      className="text-sm font-medium text-brand-indigo hover:underline"
                    >
                      Edit
                    </button>
                    {u.id !== currentUserId && (
                      <>
                        <span className="mx-2 text-border-soft">|</span>
                        <button
                          type="button"
                          onClick={() => askDelete(u)}
                          className="text-sm font-medium text-danger hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {!isLoading && !error && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-sub"
                  >
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>

      <UserFormModal
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onSaved={reload}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete user?"
        confirmLabel="Delete user"
        description={
          deleteTarget && (
            <>
              This permanently removes <strong>{deleteTarget.name}</strong> (
              {deleteTarget.email}). Their enrollments are deleted and any
              courses they teach become unassigned.
            </>
          )
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}
