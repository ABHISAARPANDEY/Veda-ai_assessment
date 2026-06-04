const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function signupUser(input: { email: string; password: string; name: string }) {
  const res = await fetch(`${API}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false as const, error: (data?.error as string) ?? "Signup failed" };
  }
  return { ok: true as const, data };
}

export interface MeUser {
  _id: string;
  email: string;
  name: string;
  avatarUrl: string;
  school: string;
}

export async function getMe(token: string): Promise<MeUser | null> {
  const res = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: MeUser };
  return data.user;
}

export async function updateMe(
  token: string,
  patch: { name?: string; school?: string }
): Promise<{ ok: true; user: MeUser } | { ok: false; error: string }> {
  const res = await fetch(`${API}/api/user/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error ?? "Update failed" };
  return { ok: true, user: data.user };
}

export async function uploadAvatar(
  token: string,
  file: File
): Promise<{ ok: true; avatarUrl: string; user: MeUser } | { ok: false; error: string }> {
  const fd = new FormData();
  fd.append("avatar", file);
  const res = await fetch(`${API}/api/user/me/avatar`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data?.error ?? "Upload failed" };
  return { ok: true, avatarUrl: data.avatarUrl, user: data.user };
}

export function avatarSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API}${url}`;
}
