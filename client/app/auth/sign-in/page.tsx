"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { VedaLogo } from "../../../components/icons/VedaLogo";
import { Button } from "../../../components/ui/Button";

// useSearchParams must live inside a Suspense boundary in Next 15 for static
// generation to succeed. Pulling the form into a child component lets the
// outer page render the shell while the inner reads the URL params.

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/assignments";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setError("Invalid email or password");
        return;
      }
      if (res?.ok === false) {
        setError("Sign-in failed. The server may be waking up — please try again.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      // signIn() rejects on network/timeout (Vercel function timeout during
      // Render cold start, etc). Without this catch the button hangs forever.
      console.error("[sign-in]", err);
      setError(
        "The server is waking up (first request after idle can take ~30s). Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          autoComplete="current-password"
          className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
        />
      </div>
      {error && <div className="text-sm text-danger">{error}</div>}
      <Button type="submit" variant="dark" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="bg-card rounded-3xl shadow-cardLg w-full max-w-md p-8 space-y-6">
        <div className="flex items-center gap-3">
          <VedaLogo size={36} />
          <span className="font-bold text-xl">VedaAI</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-secondary">Sign in to your account</p>
        </div>
        <Suspense fallback={<div className="h-12 animate-pulse bg-inset rounded-xl" />}>
          <SignInForm />
        </Suspense>
        <div className="text-sm text-secondary text-center">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="text-primary font-semibold underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
