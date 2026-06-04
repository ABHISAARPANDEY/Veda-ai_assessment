"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { listAssignments } from "../../lib/api";
import type { AssignmentDTO } from "../../types";
import { cn } from "../../lib/cn";

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const sec = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

function StatusIcon({ status }: { status: AssignmentDTO["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-statusGreen" />;
  if (status === "processing") return <Loader2 className="h-4 w-4 text-accent animate-spin" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-danger" />;
  return <Clock className="h-4 w-4 text-secondary" />;
}

function statusText(s: AssignmentDTO["status"]): string {
  if (s === "completed") return "completed";
  if (s === "processing") return "is generating";
  if (s === "failed") return "failed";
  return "is queued";
}

export function NotificationsButton() {
  const { data: session } = useSession();
  const token = (session as any)?.backendToken as string | undefined;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AssignmentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setLoading(true);
    listAssignments(token)
      .then((all) => {
        if (cancelled) return;
        setItems(all.slice(0, 8));
      })
      .catch(() => setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const unreadCount = items.filter((a) => a.status === "processing" || a.status === "failed").length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {(unreadCount > 0 || items.length === 0) && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        )}
      </button>
      {open && (
        <div className="absolute top-12 right-0 bg-card shadow-cardLg rounded-2xl w-80 max-w-[calc(100vw-2rem)] z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="font-semibold text-sm">Notifications</div>
            <Link href="/assignments" onClick={() => setOpen(false)} className="text-xs text-secondary hover:text-primary">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="py-8 grid place-items-center text-secondary">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-secondary px-4">
              You&apos;re all caught up. Notifications about your assignments will appear here.
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((a) => (
                <li key={a._id}>
                  <Link
                    href={`/assignments/${a._id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-4 py-3 hover:bg-inset border-b border-border last:border-b-0",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon status={a.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">
                          <span className="font-semibold">{a.title}</span>{" "}
                          <span className="text-secondary">{statusText(a.status)}</span>
                        </div>
                        <div className="text-xs text-secondary mt-0.5">{timeAgo(a.updatedAt)}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
