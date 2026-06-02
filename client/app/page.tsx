"use client";

import { useEffect, useRef, useState } from "react";
import { createAssignment } from "../lib/api";
import { getSocket } from "../lib/socket";
import type {
  AssignmentStatus,
  QuestionPaperDTO,
} from "../types";

const QUESTION_TYPES = ["mcq", "short", "long"] as const;

export default function HomePage() {
  const [title, setTitle] = useState("Sample Assessment");
  const [numQuestions, setNumQuestions] = useState(6);
  const [totalMarks, setTotalMarks] = useState(20);
  const [types, setTypes] = useState<string[]>(["mcq", "short"]);

  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<AssignmentStatus | "idle">("idle");
  const [progress, setProgress] = useState<{ pct: number; label: string }>({
    pct: 0,
    label: "",
  });
  const [paper, setPaper] = useState<QuestionPaperDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribedId = useRef<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    const socket = getSocket();

    const subscribe = () => {
      socket.emit("subscribe", assignmentId);
      subscribedId.current = assignmentId;
    };

    if (socket.connected) subscribe();
    socket.on("connect", subscribe);

    socket.on("job:status", (p: { assignmentId: string; status: AssignmentStatus }) => {
      if (p.assignmentId === assignmentId) setStatus(p.status);
    });
    socket.on(
      "job:progress",
      (p: { assignmentId: string; progress: number; label: string }) => {
        if (p.assignmentId === assignmentId) setProgress({ pct: p.progress, label: p.label });
      }
    );
    socket.on("job:completed", (p: { assignmentId: string; paper: QuestionPaperDTO }) => {
      if (p.assignmentId === assignmentId) {
        setPaper(p.paper);
        setStatus("completed");
      }
    });
    socket.on("job:failed", (p: { assignmentId: string; error: string }) => {
      if (p.assignmentId === assignmentId) {
        setError(p.error);
        setStatus("failed");
      }
    });

    return () => {
      socket.off("connect", subscribe);
      socket.off("job:status");
      socket.off("job:progress");
      socket.off("job:completed");
      socket.off("job:failed");
    };
  }, [assignmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaper(null);
    setStatus("idle");
    setProgress({ pct: 0, label: "" });
    setAssignmentId(null);

    const res = await createAssignment({
      title,
      numQuestions,
      totalMarks,
      questionTypes: types,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAssignmentId(res.assignment._id);
    setStatus(res.assignment.status);
  }

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>AI Assessment Creator — Phase 1</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          # Questions
          <input
            type="number"
            min={1}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Total Marks
          <input
            type="number"
            min={1}
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            required
          />
        </label>
        <fieldset>
          <legend>Question Types</legend>
          {QUESTION_TYPES.map((t) => (
            <label key={t} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={types.includes(t)}
                onChange={() => toggleType(t)}
              />
              {t}
            </label>
          ))}
        </fieldset>
        <button type="submit">Generate</button>
      </form>

      {error && (
        <div style={{ color: "crimson", marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {assignmentId && (
        <section>
          <p>
            <strong>Assignment ID:</strong> {assignmentId}
          </p>
          <p>
            <strong>Status:</strong> {status}
          </p>
          {status === "processing" && (
            <div>
              <div
                style={{
                  background: "#eee",
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                  width: 400,
                }}
              >
                <div
                  style={{
                    background: "#4caf50",
                    width: `${progress.pct}%`,
                    height: "100%",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
              <small>
                {progress.pct}% — {progress.label}
              </small>
            </div>
          )}
        </section>
      )}

      {paper && (
        <section style={{ marginTop: 24 }}>
          <h2>Generated Paper (raw JSON)</h2>
          <pre
            style={{
              background: "#f6f8fa",
              padding: 12,
              borderRadius: 6,
              overflow: "auto",
            }}
          >
            {JSON.stringify(paper, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
