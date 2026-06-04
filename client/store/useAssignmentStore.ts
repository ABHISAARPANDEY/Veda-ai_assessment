import { create } from "zustand";
import { createAssignment, type CreateAssignmentBody } from "../lib/api";

export interface QuestionRow {
  id: string;
  type: string;       // dropdown label, e.g. "Multiple Choice Questions"
  typeKey: string;    // backend value, e.g. "mcq"
  numQuestions: number;
  marks: number;      // marks PER question for this row
}

export interface FormState {
  title: string;
  dueDate: string;            // YYYY-MM-DD
  file: File | null;          // cosmetic — not transmitted (Phase 3 decision)
  rows: QuestionRow[];
  instructions: string;
}

export interface ValidationErrors {
  title?: string;
  dueDate?: string;
  rows?: string;
  totals?: string;
}

const DEFAULT_ROWS: QuestionRow[] = [
  { id: "r1", type: "Multiple Choice Questions", typeKey: "mcq", numQuestions: 4, marks: 1 },
  { id: "r2", type: "Short Answer Questions", typeKey: "short", numQuestions: 3, marks: 2 },
  { id: "r3", type: "Diagram/Graph-based Questions", typeKey: "diagram", numQuestions: 3, marks: 2 },
  { id: "r4", type: "Numerical Problems", typeKey: "numerical", numQuestions: 2, marks: 2 },
];

interface Store {
  form: FormState;
  submitting: boolean;
  submitError: string | null;

  setTitle: (s: string) => void;
  setDueDate: (s: string) => void;
  setFile: (f: File | null) => void;
  setInstructions: (s: string) => void;
  addRow: () => void;
  removeRow: (rowId: string) => void;
  updateRow: (rowId: string, patch: Partial<QuestionRow>) => void;
  totalQuestions: () => number;
  totalMarks: () => number;
  validate: () => ValidationErrors;
  submit: (token?: string | null) => Promise<{ ok: true; assignmentId: string } | { ok: false; error: string }>;
  reset: () => void;
}

const initialForm: FormState = {
  title: "",
  dueDate: "",
  file: null,
  rows: DEFAULT_ROWS,
  instructions: "",
};

export const useAssignmentStore = create<Store>((set, get) => ({
  form: initialForm,
  submitting: false,
  submitError: null,

  setTitle: (s) => set((st) => ({ form: { ...st.form, title: s } })),
  setDueDate: (s) => set((st) => ({ form: { ...st.form, dueDate: s } })),
  setFile: (f) => set((st) => ({ form: { ...st.form, file: f } })),
  setInstructions: (s) => set((st) => ({ form: { ...st.form, instructions: s } })),

  addRow: () =>
    set((st) => ({
      form: {
        ...st.form,
        rows: [
          ...st.form.rows,
          {
            id: `r${Date.now()}`,
            type: "Multiple Choice Questions",
            typeKey: "mcq",
            numQuestions: 1,
            marks: 1,
          },
        ],
      },
    })),

  removeRow: (rowId) =>
    set((st) => ({
      form: { ...st.form, rows: st.form.rows.filter((r) => r.id !== rowId) },
    })),

  updateRow: (rowId, patch) =>
    set((st) => ({
      form: {
        ...st.form,
        rows: st.form.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      },
    })),

  totalQuestions: () => get().form.rows.reduce((acc, r) => acc + r.numQuestions, 0),
  totalMarks: () => get().form.rows.reduce((acc, r) => acc + r.numQuestions * r.marks, 0),

  validate: () => {
    const { form } = get();
    const errs: ValidationErrors = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.rows.length) errs.rows = "Add at least one question type";
    const tq = form.rows.reduce((a, r) => a + r.numQuestions, 0);
    const tm = form.rows.reduce((a, r) => a + r.numQuestions * r.marks, 0);
    if (tq <= 0) errs.totals = "Total questions must be positive";
    if (tm <= 0) errs.totals = "Total marks must be positive";
    return errs;
  },

  submit: async (token) => {
    const { form, validate } = get();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      return { ok: false, error: "Please fix the highlighted fields." };
    }
    set({ submitting: true, submitError: null });
    const body: CreateAssignmentBody = {
      title: form.title.trim(),
      questionTypes: Array.from(new Set(form.rows.map((r) => r.typeKey))),
      numQuestions: form.rows.reduce((a, r) => a + r.numQuestions, 0),
      totalMarks: form.rows.reduce((a, r) => a + r.numQuestions * r.marks, 0),
      instructions: form.instructions || undefined,
      dueDate: form.dueDate || undefined,
    };
    const res = await createAssignment(body, token);
    set({ submitting: false });
    if (!res.ok) {
      set({ submitError: res.error });
      return { ok: false, error: res.error };
    }
    return { ok: true, assignmentId: res.assignment._id };
  },

  reset: () => set({ form: initialForm, submitting: false, submitError: null }),
}));
