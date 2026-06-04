import type { AssignmentDTO, QuestionPaperDTO } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface QuestionBreakdownItem {
  type: string;
  typeLabel: string;
  count: number;
  marksPerQuestion: number;
}

export interface CreateAssignmentBody {
  title: string;
  numQuestions: number;
  totalMarks: number;
  questionTypes: string[];
  questionBreakdown?: QuestionBreakdownItem[];
  instructions?: string;
  dueDate?: string;
  classLevel?: string;
  subject?: string;
}

function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createAssignment(
  body: CreateAssignmentBody,
  token?: string | null,
  file?: File | null
): Promise<
  | { ok: true; assignment: AssignmentDTO }
  | { ok: false; error: string; details?: unknown }
> {
  const headers: Record<string, string> = { ...authHeader(token) };
  let payload: BodyInit;
  if (file) {
    const fd = new FormData();
    fd.append("title", body.title);
    fd.append("numQuestions", String(body.numQuestions));
    fd.append("totalMarks", String(body.totalMarks));
    fd.append("questionTypes", JSON.stringify(body.questionTypes));
    if (body.instructions) fd.append("instructions", body.instructions);
    if (body.dueDate) fd.append("dueDate", body.dueDate);
    if (body.classLevel) fd.append("classLevel", body.classLevel);
    if (body.subject) fd.append("subject", body.subject);
    if (body.questionBreakdown) fd.append("questionBreakdown", JSON.stringify(body.questionBreakdown));
    fd.append("source", file);
    payload = fd;
    // Note: do NOT set Content-Type; the browser sets it with boundary
  } else {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}/api/assignments`, {
    method: "POST",
    headers,
    body: payload,
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed", details: data.details };
  }
  return { ok: true, assignment: data.assignment };
}

export async function listAssignments(token?: string | null): Promise<AssignmentDTO[]> {
  const res = await fetch(`${API}/api/assignments`, {
    // 2s cache — short enough that creating an assignment then navigating
    // shows it (worst case: ~2s lag), long enough that rapid back-and-forth
    // doesn't hammer the API. router.refresh() (called after create/delete)
    // busts the cache so most flows feel instant.
    next: { revalidate: 2 },
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
