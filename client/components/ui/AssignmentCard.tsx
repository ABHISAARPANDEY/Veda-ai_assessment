"use client";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { AssignmentDTO } from "../../types";
import { deleteAssignment } from "../../lib/api";
import { Card } from "./Card";

function fmt(d?: string) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
}

export function AssignmentCard({ a }: { a: AssignmentDTO }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    const token = (session as any)?.backendToken as string | undefined;
    if (!token) return;
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    const ok = await deleteAssignment(a._id, token);
    setDeleting(false);
    setMenuOpen(false);
    if (ok) router.refresh();
  }

  return (
    <Card className="p-6 relative">
      <div className="flex items-start justify-between">
        <Link
          href={`/assignments/${a._id}`}
          className="text-xl font-bold underline underline-offset-4 decoration-2 text-primary"
        >
          {a.title}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="h-8 w-8 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Card menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute top-12 right-6 bg-card shadow-cardLg rounded-xl py-2 w-44 z-10">
            <Link
              href={`/assignments/${a._id}`}
              className="block px-4 py-2 text-sm hover:bg-inset"
            >
              View Assignment
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-inset disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        )}
      </div>
      <div className="mt-10 flex items-center justify-between text-sm">
        <div>
          <span className="font-semibold">Assigned on</span>
          <span className="text-secondary"> : {fmt(a.createdAt)}</span>
        </div>
        <div>
          <span className="font-semibold">Due</span>
          <span className="text-secondary"> : {fmt(a.dueDate)}</span>
        </div>
      </div>
    </Card>
  );
}
