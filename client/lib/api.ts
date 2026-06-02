import type { AssignmentDTO } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CreateAssignmentBody {
  title: string;
  numQuestions: number;
  totalMarks: number;
  questionTypes: string[];
  instructions?: string;
  dueDate?: string;
}

export async function createAssignment(
  body: CreateAssignmentBody
): Promise<{ ok: true; assignment: AssignmentDTO } | { ok: false; error: string; details?: unknown }> {
  const res = await fetch(`${API}/api/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed", details: data.details };
  }
  return { ok: true, assignment: data.assignment };
}
