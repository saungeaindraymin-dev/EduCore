import { RequireRole } from "@/components/RequireRole";
import { AppShell } from "@/components/shell/AppShell";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireRole role="teacher">
      <AppShell>{children}</AppShell>
    </RequireRole>
  );
}
