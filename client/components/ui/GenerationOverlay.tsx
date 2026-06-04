"use client";
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { getSocket } from "../../lib/socket";
import { Button } from "./Button";
import type { AssignmentStatus, QuestionPaperDTO } from "../../types";

export function GenerationOverlay({
  assignmentId,
  onCompleted,
}: {
  assignmentId: string;
  onCompleted: (id: string) => void;
}) {
  const [status, setStatus] = useState<AssignmentStatus | "idle">("processing");
  const [label, setLabel] = useState<string>("Queued");
  const [pct, setPct] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const subscribe = () => socket.emit("subscribe", assignmentId);
    if (socket.connected) subscribe();
    socket.on("connect", subscribe);

    const onStatus = (p: { assignmentId: string; status: AssignmentStatus }) => {
      if (p.assignmentId === assignmentId) setStatus(p.status);
    };
    const onProgress = (p: { assignmentId: string; progress: number; label: string }) => {
      if (p.assignmentId === assignmentId) {
        setPct(p.progress);
        setLabel(p.label);
      }
    };
    const onCompletedSocket = (p: { assignmentId: string; paper: QuestionPaperDTO }) => {
      if (p.assignmentId === assignmentId) {
        setStatus("completed");
        onCompleted(assignmentId);
      }
    };
    const onFailed = (p: { assignmentId: string; error: string }) => {
      if (p.assignmentId === assignmentId) {
        setStatus("failed");
        setError(p.error);
      }
    };

    socket.on("job:status", onStatus);
    socket.on("job:progress", onProgress);
    socket.on("job:completed", onCompletedSocket);
    socket.on("job:failed", onFailed);
    return () => {
      socket.off("connect", subscribe);
      socket.off("job:status", onStatus);
      socket.off("job:progress", onProgress);
      socket.off("job:completed", onCompletedSocket);
      socket.off("job:failed", onFailed);
    };
  }, [assignmentId, onCompleted]);

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm grid place-items-center z-30 px-4">
      <div className="bg-card rounded-3xl shadow-cardLg w-full max-w-md p-8">
        {status !== "failed" && (
          <>
            <div className="grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-inset grid place-items-center">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-center">Generating your assignment…</h3>
            <p className="mt-1 text-sm text-secondary text-center">{label}</p>
            <div className="mt-6 h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-secondary">{pct}%</div>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-inset grid place-items-center">
                <AlertCircle className="h-6 w-6 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-center">Generation failed</h3>
            <p className="mt-1 text-sm text-secondary text-center break-words">
              {error ?? "Something went wrong."}
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="dark" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
