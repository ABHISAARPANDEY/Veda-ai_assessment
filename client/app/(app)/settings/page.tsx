"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { getMe, updateMe, uploadAvatar, avatarSrc, type MeUser } from "../../../lib/authClient";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const token = (session as any)?.backendToken as string | undefined;
  const router = useRouter();

  const [user, setUser] = useState<MeUser | null>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const me = await getMe(token);
      if (cancelled) return;
      if (me) {
        setUser(me);
        setName(me.name);
        setSchool(me.school);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await updateMe(token, { name, school });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUser(res.user);
    setMessage("Profile updated");
    // Refresh session so the topbar reflects the new name
    await update();
    router.refresh();
  }

  async function onAvatar(file: File) {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await uploadAvatar(token, file);
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUser(res.user);
    setMessage("Avatar updated");
    await update();
    router.refresh();
  }

  if (!user) {
    return <div className="pt-12 text-center text-secondary">Loading…</div>;
  }

  const src = avatarSrc(user.avatarUrl);
  const initials = user.name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 pt-2 pb-24">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-secondary">Manage your profile</p>
        </div>
      </div>

      <Card className="p-8 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-inset overflow-hidden grid place-items-center text-2xl font-bold">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary text-white grid place-items-center shadow-card"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAvatar(f);
              }}
            />
          </div>
          <div>
            <div className="text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-secondary">{user.email}</div>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4 max-w-md">
          <div>
            <label className="text-sm font-semibold block mb-1">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="form-input w-full h-12 rounded-xl bg-inset border border-border px-4 text-sm text-secondary"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">School</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="e.g. Delhi Public School, Bokaro"
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
            />
          </div>
          {message && <div className="text-sm text-statusGreen">{message}</div>}
          {error && <div className="text-sm text-danger">{error}</div>}
          <Button variant="dark" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
