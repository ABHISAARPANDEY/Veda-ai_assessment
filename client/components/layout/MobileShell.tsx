"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, LayoutGrid, FileText, Library, Sparkles } from "lucide-react";
import { VedaLogo } from "../icons/VedaLogo";
import { cn } from "../../lib/cn";
import { avatarSrc, type MeUser } from "../../lib/authClient";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/library", label: "Library", icon: Library },
  { href: "/toolkit", label: "AI Toolkit", icon: Sparkles },
];

export function MobileHeader({ user }: { user?: MeUser | null }) {
  const name = user?.name?.trim() || "User";
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const src = avatarSrc(user?.avatarUrl);
  return (
    <div className="lg:hidden sticky top-0 z-10 bg-card rounded-2xl shadow-card mx-3 mt-3 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <VedaLogo size={28} />
        <span className="font-bold">VedaAI</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="h-8 w-8 rounded-full bg-inset grid place-items-center text-xs font-bold overflow-hidden">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset" aria-label="Menu">
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </div>
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
