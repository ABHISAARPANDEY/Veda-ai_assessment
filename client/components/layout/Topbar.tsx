"use client";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { persona } from "../../lib/persona";

export function Topbar({ breadcrumb }: { breadcrumb: string }) {
  const router = useRouter();
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

      <div className="flex items-center gap-3 pr-1">
        <button
          type="button"
          className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2 pr-2">
          <div className="h-8 w-8 rounded-full bg-inset overflow-hidden grid place-items-center text-xs font-bold">
            JD
          </div>
          <span className="text-sm font-semibold">{persona.user.displayName}</span>
          <ChevronDown className="h-4 w-4 text-secondary" />
        </div>
      </div>
    </div>
  );
}
