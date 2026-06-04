import { redirect } from "next/navigation";
import { auth } from "../../auth";
import { listAssignments } from "../../lib/api";
import type { MeUser } from "../../lib/authClient";
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
  const token = (session as { backendToken?: string }).backendToken;

  // Pull user from the session JWT — zero round-trips. Settings page calls
  // session.update({ user: ... }) after save, which our jwt callback merges
  // into the token so this stays fresh.
  const su = session.user as {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    school?: string | null;
  };
  const me: MeUser = {
    _id: su.id ?? "",
    name: su.name ?? "",
    email: su.email ?? "",
    avatarUrl: su.image ?? "",
    school: su.school ?? "",
  };

  // Only the assignments count needs a network call — short-cached.
  const count = await safeCount(token);

  return (
    <AppShell breadcrumb="Assignment" assignmentsCount={count} user={me}>
      {children}
    </AppShell>
  );
}
