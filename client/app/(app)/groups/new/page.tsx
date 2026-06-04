"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Select } from "../../../../components/ui/Select";
import { createGroup } from "../../../../lib/groupsApi";

const LEVEL_OPTIONS = [
  { label: "Class 1", value: "Class 1", typeKey: "Class 1" },
  { label: "Class 2", value: "Class 2", typeKey: "Class 2" },
  { label: "Class 3", value: "Class 3", typeKey: "Class 3" },
  { label: "Class 4", value: "Class 4", typeKey: "Class 4" },
  { label: "Class 5", value: "Class 5", typeKey: "Class 5" },
  { label: "Class 6", value: "Class 6", typeKey: "Class 6" },
  { label: "Class 7", value: "Class 7", typeKey: "Class 7" },
  { label: "Class 8", value: "Class 8", typeKey: "Class 8" },
  { label: "Class 9", value: "Class 9", typeKey: "Class 9" },
  { label: "Class 10", value: "Class 10", typeKey: "Class 10" },
  { label: "Class 11", value: "Class 11", typeKey: "Class 11" },
  { label: "Class 12", value: "Class 12", typeKey: "Class 12" },
  { label: "JEE Main", value: "JEE Main", typeKey: "JEE Main" },
  { label: "JEE Advanced", value: "JEE Advanced", typeKey: "JEE Advanced" },
  { label: "NEET", value: "NEET", typeKey: "NEET" },
  { label: "General", value: "General", typeKey: "General" },
];

interface StudentRow {
  id: string;
  name: string;
  rollNo: string;
}

function newRow(): StudentRow {
  return { id: `s${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: "", rollNo: "" };
}

export default function NewGroupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as any)?.backendToken as string | undefined;

  const [name, setName] = useState("");
  const [classLevel, setClassLevel] = useState("Class 10");
  const [rows, setRows] = useState<StudentRow[]>([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(id: string, patch: Partial<StudentRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.id !== id)));
  }
  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Not signed in");
      return;
    }
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    const students = rows
      .map((r) => ({ name: r.name.trim(), rollNo: r.rollNo.trim() }))
      .filter((s) => s.name.length > 0);
    setSubmitting(true);
    const res = await createGroup(token, { name: name.trim(), classLevel, students });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/groups/${res.group._id}`);
    router.refresh();
  }

  return (
    <div className="space-y-6 pt-2 pb-24">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">New group</h1>
          <p className="text-sm text-secondary">Set up a class or batch of students</p>
        </div>
      </div>

      <Card className="p-8 space-y-6 bg-inset">
        <div>
          <h2 className="text-lg font-bold">Group details</h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Group name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 10A Physics"
                className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Class / Level</label>
              <Select
                value={classLevel}
                options={LEVEL_OPTIONS}
                onChange={(_label, value) => setClassLevel(value)}
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Students</div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-[1fr_180px_auto] gap-3 items-center">
                  <input
                    value={r.name}
                    onChange={(e) => updateRow(r.id, { name: e.target.value })}
                    placeholder="Student name"
                    className="form-input h-11 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
                  />
                  <input
                    value={r.rollNo}
                    onChange={(e) => updateRow(r.id, { rollNo: e.target.value })}
                    placeholder="Roll no."
                    className="form-input h-11 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="h-8 w-8 grid place-items-center rounded-full hover:bg-inset"
                    aria-label="Remove student"
                    disabled={rows.length === 1}
                  >
                    <X className="h-4 w-4 text-secondary" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button variant="dark" size="sm" type="button" onClick={addRow}>
                <Plus className="h-4 w-4" /> Add student
              </Button>
            </div>
          </div>

          {error && <div className="text-sm text-danger">{error}</div>}

          <div className="flex items-center justify-between pt-2">
            <Button variant="white" type="button" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Create group"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
