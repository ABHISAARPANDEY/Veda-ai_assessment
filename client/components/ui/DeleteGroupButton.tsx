"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import { Button } from "./Button";
import { deleteGroup } from "../../lib/groupsApi";

export function DeleteGroupButton({ id }: { id: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const token = (session as any)?.backendToken as string | undefined;
    if (!token) return;
    if (!confirm("Delete this group? This cannot be undone.")) return;
    setBusy(true);
    const ok = await deleteGroup(token, id);
    setBusy(false);
    if (ok) router.push("/groups");
  }

  return (
    <Button variant="white" size="sm" type="button" onClick={onClick} disabled={busy}>
      <Trash2 className="h-4 w-4 text-danger" />
      {busy ? "Deleting…" : "Delete group"}
    </Button>
  );
}
