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

function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createAssignment(
  body: CreateAssignmentBody,
  token?: string | null
): Promise<
  | { ok: true; assignment: AssignmentDTO }
  | { ok: false; error: string; details?: unknown }
> {
  const res = await fetch(`${API}/api/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed", details: data.details };
  }
  return { ok: true, assignment: data.assignment };
}

export async function listAssignments(token?: string | null): Promise<AssignmentDTO[]> {
  const res = await fetch(`${API}/api/assignments`, {
    cache: "no-store",
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error(`listAssignments failed: ${res.status}`);
  const data = (await res.json()) as { items: AssignmentDTO[] };
  return data.items;
}

export async function getAssignment(
  id: string,
  token?: string | null
): Promise<{ assignment: AssignmentDTO; paper: QuestionPaperDTO | null }> {
  const res = await fetch(`${API}/api/assignments/${id}`, {
    cache: "no-store",
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error(`getAssignment failed: ${res.status}`);
  return (await res.json()) as { assignment: AssignmentDTO; paper: QuestionPaperDTO | null };
}

export async function deleteAssignment(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API}/api/assignments/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export async function regenerateAssignment(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API}/api/assignments/${id}/regenerate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
