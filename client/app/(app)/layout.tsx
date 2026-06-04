import { listAssignments } from "../../lib/api";
import { AppShell } from "../../components/layout/AppShell";

async function safeCount(): Promise<number> {
  try {
    const items = await listAssignments();
    return items.length;
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const count = await safeCount();
  return (
    <AppShell breadcrumb="Assignment" assignmentsCount={count}>
      {children}
    </AppShell>
  );
}
