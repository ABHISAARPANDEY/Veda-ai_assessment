"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { getSocket } from "../../lib/socket";
import { getAssignment } from "../../lib/api";
import { Button } from "./Button";
import type { AssignmentStatus, QuestionPaperDTO } from "../../types";

// Polling interval for the API fallback. Picks up status changes when socket
// events are missed (e.g. socket connects after the worker already finished,
// which happens on Render free-tier cold starts).
const POLL_MS = 1500;
const FIRST_TICK_MS = 600;
const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms);
      }),
    ]);
    return result;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function GenerationOverlay({
  assignmentId,
  onCompleted,
}: {
  assignmentId: string;
  onCompleted: (id: string) => void;
}) {
  const { data: session } = useSession();
  const token = (session as { backendToken?: string } | null)?.backendToken;

  const [status, setStatus] = useState<AssignmentStatus | "idle">("processing");
  const [label, setLabel] = useState<string>("Starting…");
  const [pct, setPct] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  // Refs so the polling effect can read the current status without re-running
  const finishedRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  // Socket effect (live path — fast when events arrive normally)
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
      if (p.assignmentId === assignmentId && !finishedRef.current) {
        finishedRef.current = true;
        setStatus("completed");
        onCompletedRef.current(assignmentId);
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
  }, [assignmentId]);

  // Polling fallback (safety net — catches up when socket events were missed)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (cancelled || finishedRef.current) return;
      const data = await fetchWithTimeout(getAssignment(assignmentId, token), FETCH_TIMEOUT_MS);
      if (cancelled) return;
      if (data) {
        const s = data.assignment.status as AssignmentStatus;
        setStatus((prev) => (prev === "failed" ? prev : s));
        if (s === "processing" && label === "Starting…") setLabel("Generating…");
        if (s === "completed" && !finishedRef.current) {
          finishedRef.current = true;
          setLabel("Done");
          setPct(100);
          setTimeout(() => onCompletedRef.current(assignmentId), 200);
          return;
        }
        if (s === "failed" && !finishedRef.current) {
          finishedRef.current = true;
          setStatus("failed");
          setError("Generation failed on the server");
          return;
        }
      }
      // Continue polling — fast retry whether the call returned or timed out
      if (!cancelled) timer = setTimeout(tick, POLL_MS);
    };

    // Start polling almost immediately so a slow-socket first event doesn't strand us
    timer = setTimeout(tick, FIRST_TICK_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [assignmentId, token]);

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
            <p className="mt-4 text-[11px] text-secondary text-center">
              First request after idle can take ~30s while the API wakes up.
            </p>
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
