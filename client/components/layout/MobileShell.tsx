"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Menu,
  X,
  LayoutGrid,
  Users,
  FileText,
  BookOpen,
  Library,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { VedaLogo } from "../icons/VedaLogo";
import { NotificationsButton } from "./NotificationsButton";
import { avatarSrc, type MeUser } from "../../lib/authClient";
import { cn } from "../../lib/cn";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/library", label: "Library", icon: Library },
  { href: "/toolkit", label: "AI Toolkit", icon: Sparkles },
];

const DRAWER_NAV = [
  { href: "/", label: "Home", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/groups", label: "My Groups", icon: <Users className="h-4 w-4" /> },
  { href: "/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/library", label: "My Library", icon: <Library className="h-4 w-4" /> },
  { href: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
];

export function MobileHeader({ user }: { user?: MeUser | null }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const name = user?.name?.trim() || "User";
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const src = avatarSrc(user?.avatarUrl);
  const school = user?.school?.trim() || "";

  return (
    <>
      <div className="lg:hidden sticky top-0 z-10 bg-card rounded-2xl shadow-card mx-3 mt-3 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VedaLogo size={28} />
          <span className="font-bold">VedaAI</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationsButton />
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset overflow-hidden"
            aria-label="Open menu"
          >
            <div className="h-8 w-8 rounded-full bg-inset grid place-items-center text-xs font-bold overflow-hidden">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </button>
          <button
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
            aria-label="Menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[280px] max-w-[80vw] bg-card shadow-cardLg flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <VedaLogo size={28} />
                <span className="font-bold">VedaAI</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
              <div className="h-10 w-10 rounded-full bg-inset grid place-items-center text-xs font-bold overflow-hidden">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={name} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-sm font-semibold truncate">{name}</div>
                <div className="text-xs text-secondary truncate">{school || "No school set"}</div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-4">
              {DRAWER_NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-primary/85 hover:bg-inset"
                >
                  <span className="text-secondary">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="px-2 py-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  signOut({ callbackUrl: "/auth/sign-in" });
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-danger hover:bg-inset"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-20 bg-primary text-white rounded-full shadow-cardLg flex items-center justify-around py-2">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-full text-[11px]",
              active ? "bg-white text-primary px-4" : "text-white/70"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
