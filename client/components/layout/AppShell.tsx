import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileHeader, MobileTabs } from "./MobileShell";

export function AppShell({
  breadcrumb,
  assignmentsCount,
  children,
}: {
  breadcrumb: string;
  assignmentsCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page">
      <div className="flex">
        <Sidebar assignmentsCount={assignmentsCount} />
        <div className="flex-1 min-w-0">
          <div className="hidden lg:block">
            <Topbar breadcrumb={breadcrumb} />
          </div>
          <MobileHeader />
          <main className="px-3 lg:px-4 pb-24 lg:pb-4">{children}</main>
        </div>
      </div>
      <MobileTabs />
    </div>
  );
}
