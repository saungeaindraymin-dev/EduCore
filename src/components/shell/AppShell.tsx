"use client";

import { useCallback, useState } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { accessApi } from "@/lib/api/access";
import { useAuthStore } from "@/stores/useAuthStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// Layout for every signed-in area. The sidebar menu comes from GET /api/me/access,
// so which items each role sees is decided by the API's permission map.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  const userId = useAuthStore((s) => s.user?.id);
  const access = useApiQuery(`access:${userId}`, () => accessApi.get());
  const navStatus = access.data ? "ready" : access.error ? "error" : "loading";

  return (
    <div className="min-h-screen bg-app">
      <Sidebar
        open={navOpen}
        onClose={closeNav}
        items={access.data?.data.navigation ?? []}
        status={navStatus}
        onRetry={access.reload}
      />

      <div className="flex min-h-screen flex-col lg:pl-[248px]">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
