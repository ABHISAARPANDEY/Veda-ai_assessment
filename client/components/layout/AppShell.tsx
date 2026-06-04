import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileHeader, MobileTabs } from "./MobileShell";
import { RouteProgress } from "./RouteProgress";
import type { MeUser } from "../../lib/authClient";

export function AppShell({
  breadcrumb,
  assignmentsCount,
  user,
  children,
}: {
  breadcrumb: string;
  assignmentsCount?: number;
  user?: MeUser | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page">
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <div className="flex">
        <Sidebar assignmentsCount={assignmentsCount} user={user} />
        <div className="flex-1 min-w-0">
          <div className="hidden lg:block">
            <Topbar breadcrumb={breadcrumb} user={user} />
          </div>
          <MobileHeader user={user} />
          <main className="px-3 lg:px-4 pb-24 lg:pb-4">{children}</main>
        </div>
      </div>
      <MobileTabs />
    </div>
  );
}
