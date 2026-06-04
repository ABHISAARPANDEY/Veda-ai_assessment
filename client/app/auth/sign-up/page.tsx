"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { signupUser } from "../../../lib/authClient";
import { VedaLogo } from "../../../components/icons/VedaLogo";
import { Button } from "../../../components/ui/Button";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    const res = await signupUser({ name, email, password });
    if (!res.ok) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    // Auto sign-in
    const si = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);
    if (si?.error) {
      setError("Signup ok but auto sign-in failed. Try sign-in.");
      return;
    }
    router.push("/assignments");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="bg-card rounded-3xl shadow-cardLg w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <VedaLogo size={36} />
          <span className="font-bold text-xl">VedaAI</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-secondary">Start creating AI-powered assignments</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
            />
            <div className="mt-1 text-xs text-muted">At least 8 characters</div>
          </div>
          {error && <div className="text-sm text-danger">{error}</div>}
          <Button type="submit" variant="dark" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <div className="text-sm text-secondary text-center">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-primary font-semibold underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
