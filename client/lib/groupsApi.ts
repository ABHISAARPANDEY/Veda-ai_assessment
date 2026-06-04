import type { GroupDTO, Student } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeader(token?: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listGroups(token: string): Promise<GroupDTO[]> {
  const res = await fetch(`${API}/api/groups`, {
    cache: "no-store",
    headers: { ...authHeader(token) },
  });
  if (!res.ok) throw new Error(`listGroups failed: ${res.status}`);
  const data = (await res.json()) as { items: GroupDTO[] };
  return data.items;
}

export async function getGroup(id: string, token: string): Promise<GroupDTO | null> {
  const res = await fetch(`${API}/api/groups/${id}`, {
    cache: "no-store",
    headers: { ...authHeader(token) },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { group: GroupDTO };
  return data.group;
}

export async function createGroup(
  token: string,
  input: { name: string; classLevel?: string; students?: Student[] }
): Promise<{ ok: true; group: GroupDTO } | { ok: false; error: string }> {
  const res = await fetch(`${API}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error ?? "Create failed" };
  return { ok: true, group: data.group };
}

export async function updateGroup(
  token: string,
  id: string,
  patch: { name?: string; classLevel?: string; students?: Student[] }
): Promise<{ ok: true; group: GroupDTO } | { ok: false; error: string }> {
  const res = await fetch(`${API}/api/groups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error ?? "Update failed" };
  return { ok: true, group: data.group };
}

export async function deleteGroup(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${API}/api/groups/${id}`, {
    method: "DELETE",
    headers: { ...authHeader(token) },
  });
  return res.ok;
}
