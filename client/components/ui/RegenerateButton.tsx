"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { regenerateAssignment } from "../../lib/api";
import { GenerationOverlay } from "./GenerationOverlay";

export function RegenerateButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);

  async function onClick() {
    const token = (session as any)?.backendToken as string | undefined;
    if (!token) return;
    setBusy(true);
    const ok = await regenerateAssignment(assignmentId, token);
    setBusy(false);
    if (ok) setActive(true);
  }

  return (
    <>
      <Button variant="white" size="sm" type="button" onClick={onClick} disabled={busy}>
        <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {busy ? "Regenerating…" : "Regenerate"}
      </Button>
      {active && (
        <GenerationOverlay
          assignmentId={assignmentId}
          onCompleted={(_id: string) => {
            setActive(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
