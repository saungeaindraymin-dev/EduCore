"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, dashboardPathFor } from "@/stores/useAuthStore";
import type { Role } from "@/lib/api/auth";

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  // Wait for the persisted session to load, otherwise a page refresh
  // sees the empty initial state and bounces to /login.
  const hydrated = useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== role) {
      router.replace(dashboardPathFor(user.role));
    }
  }, [hydrated, isAuthenticated, user, role, router]);

  if (!hydrated || !isAuthenticated || (user && user.role !== role)) {
    return null;
  }
  return <>{children}</>;
}
