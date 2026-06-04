"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { ProgressBar } from "../../../../components/ui/ProgressBar";
import { FileDropzone } from "../../../../components/ui/FileDropzone";
import { DateInput } from "../../../../components/ui/DateInput";
import { Select } from "../../../../components/ui/Select";
import { Stepper } from "../../../../components/ui/Stepper";
import { Textarea } from "../../../../components/ui/Textarea";
import { useAssignmentStore } from "../../../../store/useAssignmentStore";
import { GenerationOverlay } from "../../../../components/ui/GenerationOverlay";

const QUESTION_OPTIONS = [
  { label: "Multiple Choice Questions", value: "mcq", typeKey: "mcq" },
  { label: "Short Answer Questions", value: "short", typeKey: "short" },
  { label: "Diagram/Graph-based Questions", value: "diagram", typeKey: "diagram" },
  { label: "Numerical Problems", value: "numerical", typeKey: "numerical" },
  { label: "Long Answer Questions", value: "long", typeKey: "long" },
];

export default function NewAssignmentPage() {
  const router = useRouter();
  const form = useAssignmentStore((s) => s.form);
  const setTitle = useAssignmentStore((s) => s.setTitle);
  const setDueDate = useAssignmentStore((s) => s.setDueDate);
  const setFile = useAssignmentStore((s) => s.setFile);
  const setInstructions = useAssignmentStore((s) => s.setInstructions);
  const addRow = useAssignmentStore((s) => s.addRow);
  const removeRow = useAssignmentStore((s) => s.removeRow);
  const updateRow = useAssignmentStore((s) => s.updateRow);
  const totalQuestions = useAssignmentStore((s) => s.totalQuestions);
  const totalMarks = useAssignmentStore((s) => s.totalMarks);
  const validate = useAssignmentStore((s) => s.validate);
  const submit = useAssignmentStore((s) => s.submit);
  const submitting = useAssignmentStore((s) => s.submitting);

  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  async function onNext() {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const res = await submit();
    if (res.ok) setActiveId(res.assignmentId);
  }

  return (
    <div className="space-y-6 pt-2 pb-32">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">Create Assignment</h1>
          <p className="text-sm text-secondary">Set up a new assignment for your students</p>
        </div>
      </div>

      <ProgressBar step={1} total={2} />

      <Card className="p-8 space-y-8 bg-inset">
        <div>
          <h2 className="text-lg font-bold">Assignment Details</h2>
          <p className="text-sm text-secondary">Basic information about your assignment</p>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Quiz on Electricity"
            className="form-input w-full h-12 rounded-xl bg-card border border-border px-4 text-sm placeholder:text-muted focus:border-primary focus:ring-0"
          />
          {errors.title && <div className="mt-1 text-xs text-danger">{errors.title}</div>}
        </div>

        <FileDropzone onFile={setFile} />

        <div>
          <label className="text-sm font-semibold block mb-2">Due Date</label>
          <DateInput value={form.dueDate} onChange={setDueDate} />
        </div>

        <div>
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 text-sm font-semibold text-primary mb-3 items-center">
            <div>Question Type</div>
            <div className="w-6" />
            <div className="text-right pr-2">No. of Questions</div>
            <div className="text-right pr-2">Marks</div>
          </div>
          <div className="space-y-3">
            {form.rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                <Select
                  value={r.typeKey}
                  options={QUESTION_OPTIONS}
                  onChange={(label, _value, typeKey) =>
                    updateRow(r.id, { type: label, typeKey })
                  }
                />
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="h-8 w-8 grid place-items-center rounded-full hover:bg-inset"
                  aria-label="Remove row"
                >
                  <X className="h-4 w-4 text-secondary" />
                </button>
                <Stepper
                  value={r.numQuestions}
                  min={0}
                  onChange={(v) => updateRow(r.id, { numQuestions: v })}
                />
                <Stepper
                  value={r.marks}
                  min={0}
                  onChange={(v) => updateRow(r.id, { marks: v })}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button variant="dark" size="sm" type="button" onClick={addRow}>
              <Plus className="h-4 w-4" /> Add Question Type
            </Button>
            <div className="text-sm text-right">
              <div>
                <span className="font-semibold">Total Questions:</span>{" "}
                <span>{totalQuestions()}</span>
              </div>
              <div>
                <span className="font-semibold">Total Marks:</span> <span>{totalMarks()}</span>
              </div>
            </div>
          </div>
          {errors.totals && <div className="mt-1 text-xs text-danger">{errors.totals}</div>}
          {errors.rows && <div className="mt-1 text-xs text-danger">{errors.rows}</div>}
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">
            Additional Information (for better output)
          </label>
          <Textarea
            value={form.instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="e.g. Emphasis on chapters 1, 4 from NCERT class 5"
          />
        </div>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="white" type="button" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Previous
        </Button>
        <Button variant="dark" type="button" onClick={onNext} disabled={submitting}>
          {submitting ? "Submitting…" : "Next"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {activeId && (
        <GenerationOverlay
          assignmentId={activeId}
          onCompleted={(id) => router.push(`/assignments/${id}`)}
        />
      )}
    </div>
  );
}
