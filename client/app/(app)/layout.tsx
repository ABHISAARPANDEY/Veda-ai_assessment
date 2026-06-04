import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { listAssignments } from "../../lib/api";
import { getMe, type MeUser } from "../../lib/authClient";
import { AppShell } from "../../components/layout/AppShell";

async function safeCount(token?: string | null): Promise<number> {
  try {
    const items = await listAssignments(token);
    return items.length;
  } catch {
    return 0;
  }
}

async function safeMe(token?: string | null): Promise<MeUser | null> {
  if (!token) return null;
  return await getMe(token);
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }
  const token = (session as any).backendToken as string | undefined;
  const [count, me] = await Promise.all([safeCount(token), safeMe(token)]);
  return (
    <AppShell breadcrumb="Assignment" assignmentsCount={count} user={me}>
      {children}
    </AppShell>
  );
}
