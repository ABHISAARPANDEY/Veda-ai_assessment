"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Select } from "../../../../components/ui/Select";
import { Stepper } from "../../../../components/ui/Stepper";
import { GenerationOverlay } from "../../../../components/ui/GenerationOverlay";
import { createAssignment } from "../../../../lib/api";

const LEVEL_OPTIONS = [
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

export default function QuickQuizPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session as any)?.backendToken as string | undefined;

  const [topic, setTopic] = useState("");
  const [classLevel, setClassLevel] = useState("Class 10");
  const [subject, setSubject] = useState("");
  const [count, setCount] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Not signed in");
      return;
    }
    if (!topic.trim()) {
      setError("Topic is required");
      return;
    }
    setSubmitting(true);
    const res = await createAssignment(
      {
        title: topic.trim(),
        classLevel,
        subject: subject.trim() || undefined,
        questionTypes: ["mcq"],
        numQuestions: count,
        totalMarks: count * 2,
        questionBreakdown: [
          { type: "mcq", typeLabel: "Multiple Choice Questions", count, marksPerQuestion: 2 },
        ],
        instructions: "Quick Quiz format — fast, MCQ only.",
      },
      token
    );
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setActiveId(res.assignment._id);
  }

  return (
    <div className="space-y-6 pt-2 pb-24">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-accent mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Quick Quiz</h1>
          <p className="text-sm text-secondary">Generate a fast MCQ quiz on any topic</p>
        </div>
      </div>

      <Card className="p-8 space-y-6 bg-inset">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-semibold block mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Newton's laws of motion"
              className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold block mb-2">Class / Level</label>
              <Select
                value={classLevel}
                options={LEVEL_OPTIONS}
                onChange={(_label, value) => setClassLevel(value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Subject (optional)</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Physics"
                className="form-input w-full h-11 rounded-xl bg-card border border-border px-4 text-sm focus:border-primary focus:ring-0"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-2">Number of questions</label>
            <Stepper value={count} min={3} max={15} onChange={setCount} />
          </div>

          {error && <div className="text-sm text-danger">{error}</div>}

          <div className="flex items-center justify-between pt-2">
            <Button variant="white" type="button" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="dark" type="submit" disabled={submitting}>
              {submitting ? "Generating…" : "Generate quiz"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>

      {activeId && (
        <GenerationOverlay
          assignmentId={activeId}
          onCompleted={(id) => router.push(`/assignments/${id}`)}
        />
      )}
    </div>
  );
}
