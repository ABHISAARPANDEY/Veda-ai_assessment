import type { AssignmentDTO, QuestionPaperDTO } from "../types";

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
): Promise<
  | { ok: true; assignment: AssignmentDTO }
  | { ok: false; error: string; details?: unknown }
> {
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

export async function listAssignments(): Promise<AssignmentDTO[]> {
  const res = await fetch(`${API}/api/assignments`, { cache: "no-store" });
  if (!res.ok) throw new Error(`listAssignments failed: ${res.status}`);
  const data = (await res.json()) as { items: AssignmentDTO[] };
  return data.items;
}

export async function getAssignment(
  id: string
): Promise<{ assignment: AssignmentDTO; paper: QuestionPaperDTO | null }> {
  const res = await fetch(`${API}/api/assignments/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getAssignment failed: ${res.status}`);
  return (await res.json()) as { assignment: AssignmentDTO; paper: QuestionPaperDTO | null };
}
