"use client";
import { useState } from "react";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function Topbar({ breadcrumb }: { breadcrumb: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const name = session?.user?.name ?? "User";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarUrl = session?.user?.image ?? null;

  return (
    <div className="mx-4 my-4 flex items-center justify-between bg-card rounded-full shadow-card px-3 py-2">
      <div className="flex items-center gap-3 pl-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="h-8 w-8 grid place-items-center rounded-md bg-inset">
          <LayoutGrid className="h-4 w-4 text-secondary" />
        </span>
        <span className="text-sm font-medium text-secondary">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-3 pr-1 relative">
        <button
          type="button"
          className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pr-2 hover:bg-inset rounded-full pl-2 py-1"
        >
          <div className="h-8 w-8 rounded-full bg-inset overflow-hidden grid place-items-center text-xs font-bold">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="text-sm font-semibold">{name}</span>
          <ChevronDown className="h-4 w-4 text-secondary" />
        </button>
        {open && (
          <div className="absolute top-12 right-0 bg-card shadow-cardLg rounded-xl py-2 w-48 z-30">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-inset"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
              className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm hover:bg-inset text-danger"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
