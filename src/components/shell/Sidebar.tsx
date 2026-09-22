"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavItem } from "@/lib/api/access";
import { initials } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { NavIcon } from "./NavIcon";

export type NavStatus = "loading" | "ready" | "error";

export function Sidebar({
  open,
  onClose,
  items,
  status,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  status: NavStatus;
  onRetry: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  // Longest matching href wins, so "/teacher" isn't also highlighted on "/teacher/courses"
  const activeHref = items
    .filter(
      (item) =>
        !item.comingSoon &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    )
    .reduce<string | undefined>(
      (best, item) => (!best || item.href.length > best.length ? item.href : best),
      undefined,
    );

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-border-soft bg-surface transition-[transform,visibility] duration-200 lg:visible lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0 shadow-xl" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border-soft px-6">
          <div className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-brand">
            <IconAcademic />
          </div>
          <span className="font-heading text-lg font-bold text-ink">
            EduCore
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="-mr-2 ml-auto rounded-lg p-2 text-sub hover:bg-field hover:text-ink lg:hidden"
          >
            <IconX />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sub/70">
            Menu
          </p>

          {status === "loading" &&
            items.length === 0 &&
            Array.from({ length: 5 }, (_, i) => (
              <div
                key={`nav-skeleton-${i}`}
                className="h-10 animate-pulse rounded-lg bg-field"
              />
            ))}

          {status === "error" && items.length === 0 && (
            <div
              role="alert"
              className="rounded-lg bg-danger-bg px-3 py-3 text-sm text-danger"
            >
              Couldn&apos;t load your menu.{" "}
              <button
                type="button"
                onClick={onRetry}
                className="font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {items.map((item) =>
            item.comingSoon ? (
              <div
                key={item.key}
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sub/60"
              >
                <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
                <span className="ml-auto rounded-full bg-field px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sub">
                  Soon
                </span>
              </div>
            ) : (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                aria-current={item.href === activeHref ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo/40 ${
                  item.href === activeHref
                    ? "bg-brand-gradient text-white shadow-brand"
                    : "text-sub hover:bg-field hover:text-ink"
                }`}
              >
                <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="shrink-0 border-t border-border-soft p-4">
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
              {initials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.name}
              </p>
              <p className="truncate text-xs text-sub">
                <span className="capitalize">{user?.role}</span>
                {user?.email ? ` · ${user.email}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-sub transition hover:bg-danger-bg hover:text-danger"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function IconAcademic() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
      />
    </svg>
  );
}
function IconX() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.75}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
      />
    </svg>
  );
}
