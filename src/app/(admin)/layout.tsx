import { RequireRole } from "@/components/RequireRole";
import { AppShell } from "@/components/shell/AppShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="admin">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
