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
