import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { listAssignments } from "../../lib/api";
import { AppShell } from "../../components/layout/AppShell";

async function safeCount(token?: string | null): Promise<number> {
  try {
    const items = await listAssignments(token);
    return items.length;
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  const token = (session as any).backendToken as string | undefined;
  const count = await safeCount(token);
  return (
    <AppShell breadcrumb="Assignment" assignmentsCount={count}>
      {children}
    </AppShell>
  );
}
