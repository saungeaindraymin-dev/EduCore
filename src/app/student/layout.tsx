import { RequireRole } from "@/components/RequireRole";
import { AppShell } from "@/components/shell/AppShell";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="student">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
