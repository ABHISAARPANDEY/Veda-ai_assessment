"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutGrid,
  Users,
  FileText,
  BookOpen,
  Library,
  Settings,
  Sparkles,
} from "lucide-react";
import { VedaLogo } from "../icons/VedaLogo";
import { cn } from "../../lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/groups", label: "My Groups", icon: <Users className="h-4 w-4" /> },
  { href: "/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/library", label: "My Library", icon: <Library className="h-4 w-4" /> },
];

export function Sidebar({ assignmentsCount }: { assignmentsCount?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const school = (session?.user as any)?.school || "Add your school in Settings";
  const schoolInitials = school
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase() || "VA";

  return (
    <aside className="hidden lg:flex flex-col w-[270px] shrink-0 bg-card rounded-2xl shadow-card my-4 ml-4 p-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <VedaLogo size={32} />
        <span className="font-bold text-lg">VedaAI</span>
      </div>

      <button
        type="button"
        className="mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-white shadow-toolkitGlow"
      >
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="font-semibold text-sm">AI Teacher's Toolkit</span>
      </button>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const count = item.label === "Assignments" ? assignmentsCount : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                active ? "bg-inset text-primary" : "text-primary/85 hover:bg-inset"
              )}
            >
              <span className="text-secondary">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {typeof count === "number" && count > 0 && (
                <span className="text-[11px] font-semibold text-white bg-accent rounded-full px-2 py-0.5">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-primary/85 hover:bg-inset"
        >
          <Settings className="h-4 w-4 text-secondary" />
          Settings
        </Link>
        <div className="flex items-center gap-3 bg-surface2 rounded-2xl p-3">
          <div className="h-9 w-9 rounded-full bg-inset grid place-items-center text-xs font-bold">
            {schoolInitials}
          </div>
          <div className="leading-tight truncate">
            <div className="text-sm font-semibold truncate">{school || "Your school"}</div>
            <div className="text-xs text-secondary truncate">{session?.user?.email ?? ""}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
