# AI Assessment Creator — Phase 3: Pixel-Perfect Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare Phase 1 test client with the pixel-perfect VedaAI frontend (sidebar + topbar + dashboard empty state + assignments list + create form + generation overlay + output paper), wired to the existing backend pipeline with real-time progress, while extending the backend with an `answer` field per question and a list endpoint.

**Architecture:** Next.js App Router pages share a single `(app)` layout providing the sidebar + topbar (desktop) and mobile shell. Form state lives in a Zustand store; submitting POSTs to `/api/assignments`, then the Generation overlay listens to Socket.IO events scoped by `assignmentId`. On `job:completed` we route to `/assignments/[id]` which uses GET fallback if the socket missed events. Backend is extended with `answer: string` per question (so the output page can render the Answer Key as in the Figma) and a `GET /api/assignments` list endpoint (so the assignments index can show real cards).

**Tech Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + Zustand + lucide-react (icons) + clsx + date-fns. Server changes: Zod, Mongoose, prompt builder, route module (no new deps).

**Design source of truth:** `client/design-spec.md` + reference PNGs in `client/design-reference/ref-1-*.png` through `ref-9-*.png`.

---

## File Structure

### Server changes (Phase 2 amendment)

| File | What |
|------|------|
| `server/src/workers/paperSchema.ts` | Add `answer` to QuestionSchema, update inferred type |
| `server/src/workers/promptBuilder.ts` | Update SYSTEM_PROMPT to instruct model to produce answer per question |
| `server/src/models/QuestionPaper.ts` | Add `answer` to Question subschema |
| `server/src/types/questionPaper.ts` | Add `answer: string` to `Question` interface |
| `server/src/routes/assignments.routes.ts` | Add `GET /api/assignments` (list) |

### Client — new structure

```
client/
  app/
    layout.tsx                       (existing — wrap with InterFont)
    globals.css                      (Tailwind base + custom design tokens)
    page.tsx                         (existing — REPLACE with Dashboard empty state)
    (app)/
      layout.tsx                     (sidebar + topbar shell)
      assignments/
        page.tsx                     (assignments list)
        new/
          page.tsx                   (create assignment form)
        [id]/
          page.tsx                   (paper output, with GET fallback)
  components/
    layout/
      Sidebar.tsx                    (desktop sidebar)
      Topbar.tsx                     (desktop topbar)
      MobileShell.tsx                (mobile header + bottom tabs)
      AppShell.tsx                   (composes Sidebar/Topbar/MobileShell)
    ui/
      Button.tsx                     (dark pill / ghost pill / icon button)
      Card.tsx                       (white rounded card)
      Stepper.tsx                    (− value + control for count/marks)
      DateInput.tsx                  (styled date input matching design)
      FileDropzone.tsx               (dashed-border file picker)
      Select.tsx                     (styled select dropdown)
      Textarea.tsx                   (styled textarea)
      ProgressBar.tsx                (two-segment step bar)
      EmptyState.tsx                 (illustration + heading + CTA)
      AssignmentCard.tsx             (list card)
      GenerationOverlay.tsx          (modal during job)
      PaperBanner.tsx                (dark AI banner at top of output)
      PaperHeader.tsx                (school + subject/class + meta + student info)
      QuestionList.tsx               (numbered questions with difficulty + marks)
      AnswerKey.tsx                  (numbered answers)
      DifficultyText.tsx             (tinted bracketed difficulty)
    icons/
      VedaLogo.tsx                   (brand logo svg)
      EmptyStateIllustration.tsx     (paper + magnifier + X svg)
  lib/
    api.ts                           (existing — extend with listAssignments + getAssignment)
    socket.ts                        (existing — keep)
    cn.ts                            (clsx wrapper)
    persona.ts                       (hardcoded user + school for design)
  store/
    useAssignmentStore.ts            (Zustand: form state + validation + submit)
  types/
    index.ts                         (existing — extend `Question` with `answer: string`)
  tailwind.config.ts                 (new — design tokens + Inter font)
  postcss.config.mjs                 (new — Tailwind+autoprefixer)
```

**Decomposition rationale:**
- Pages own routing and data fetching; components own rendering and pure UI behaviour; the `useAssignmentStore` owns mutable form/submission state. Keeping the AppShell components small (`Sidebar`, `Topbar`, `MobileShell`) makes the desktop/mobile responsive logic obvious.
- `lib/persona.ts` centralises the hardcoded design strings ("Lakshya", "Delhi Public School, Sector-4, Bokaro", "John Doe") so they're swappable later without touching component files.

---

## Server amendment block (must complete before client output page is built)

### Task A1: Extend Zod schema with `answer`

**Files:**
- Modify: `server/src/workers/paperSchema.ts`

- [ ] **Step 1: Replace `QuestionSchema` and bump inferred type**

Replace the existing `QuestionSchema` definition with:

```typescript
export const QuestionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z.string().min(1, "question text is required"),
  difficulty: DifficultyEnum,
  marks: z.number().positive("marks must be positive"),
  type: z.string().min(1, "type is required"),
  answer: z.string().min(1, "answer is required"),
});
```

Leave `SectionSchema`, `PaperSchema`, `validatePaperAgainstAssignment`, and the `DifficultyEnum`/`Difficulty` exports untouched.

- [ ] **Step 2: Smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: **2 errors** in `generation.worker.ts` and `types/questionPaper.ts` because the inferred `Question` type now requires `answer`. These will be fixed in A3 + A4 — leave them for now and proceed.

- [ ] **Step 3: Stage, do not commit yet** — commit batches with A2 + A3 + A4 once all four compile cleanly.

### Task A2: Update prompt builder for answers

**Files:**
- Modify: `server/src/workers/promptBuilder.ts`

- [ ] **Step 1: Update the SYSTEM_PROMPT constant**

Replace the entire `SYSTEM_PROMPT` constant value (lines ~15–47 of the file) with the version below. The only changes are: (a) the JSON shape includes an `answer` field, and (b) a new generation rule that requires answers.

```typescript
const SYSTEM_PROMPT = `You are an exam question paper generator for school teachers.

Output rules (these are not optional):
- Respond with ONLY valid JSON. No markdown fences, no commentary, no prose around it.
- Match this exact JSON shape:
{
  "sections": [
    {
      "id": "A",
      "title": "Section A — <topical name>",
      "instruction": "<one-line instruction such as 'Attempt all questions.'>",
      "questions": [
        {
          "id": "A1",
          "text": "<the full question>",
          "difficulty": "easy" | "medium" | "hard",
          "marks": <positive number>,
          "type": "<one of the requested question types, e.g. 'mcq', 'short', 'long'>",
          "answer": "<the model's answer to this question, 1-3 sentences>"
        }
      ]
    }
  ]
}

Generation rules:
- Generate EXACTLY the requested number of questions in total, distributed across logical sections (Section A, Section B, ...) grouped by question type or difficulty.
- Distribute the requested total marks across the questions so they SUM TO EXACTLY the requested totalMarks. Whole numbers preferred.
- Every "difficulty" value must be exactly one of: "easy", "medium", "hard". No other values.
- Every "type" value must be one of the requested question types.
- Each question must have non-empty "text".
- Each question must have a non-empty "answer" — the correct answer to the question, written as a short explanation (1-3 sentences).
- Each section must have at least one question.
- Question and section ids should be short and stable (e.g. "A", "B"; "A1", "A2", "B1").
- If source material is provided, base questions on it. Otherwise generate questions appropriate to the title/topic.`;
```

- [ ] **Step 2: Smoke compile** — Run: `cd server && npx tsc --noEmit`. Expected: still the same 2 errors from A1; no new ones. Continue.

### Task A3: Update Mongoose Question subschema

**Files:**
- Modify: `server/src/models/QuestionPaper.ts`

- [ ] **Step 1: Add `answer` to QuestionSchema**

Find the `QuestionSchema` definition near the top of the file and add an `answer` field. Replace this block:

```typescript
const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);
```

with:

```typescript
const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    type: { type: String, required: true },
    answer: { type: String, default: "" },
  },
  { _id: false }
);
```

> Using `default: ""` rather than `required: true` keeps existing Phase 2 documents (which have no `answer`) readable on GET, so existing data still renders without a migration.

- [ ] **Step 2: Smoke compile** — `cd server && npx tsc --noEmit`. Expected: 1 remaining error in `types/questionPaper.ts`. Continue.

### Task A4: Update shared TS types

**Files:**
- Modify: `server/src/types/questionPaper.ts`

- [ ] **Step 1: Add `answer` to `Question`**

Replace the `Question` interface block (lines ~3–9) with:

```typescript
export interface Question {
  id: string;
  text: string;
  difficulty: Difficulty;
  marks: number;
  type: string;
  answer: string;
}
```

- [ ] **Step 2: Smoke compile** — `cd server && npx tsc --noEmit`. Expected: **zero errors**.

- [ ] **Step 3: Commit A1+A2+A3+A4 together**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/paperSchema.ts server/src/workers/promptBuilder.ts server/src/models/QuestionPaper.ts server/src/types/questionPaper.ts
git commit -m "feat(server): add answer field per question (schema + prompt + model + types)"
```

### Task A5: Add GET /api/assignments list endpoint

**Files:**
- Modify: `server/src/routes/assignments.routes.ts`

- [ ] **Step 1: Add the list handler before the `GET /:id` handler**

Right before the existing `assignmentsRouter.get("/:id", ...)` handler, insert:

```typescript
assignmentsRouter.get("/", async (_req: Request, res: Response) => {
  const items = await Assignment.find().sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ items });
});
```

- [ ] **Step 2: Smoke compile** — `cd server && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 3: Live verify (with API + worker running from earlier sessions)**

```bash
curl -sS http://localhost:4000/api/assignments | jq '.items | length, .items[0] | {title, status, _id}'
```

Expected: a positive integer count and the most recent assignment's title/status/_id.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/routes/assignments.routes.ts
git commit -m "feat(server): GET /api/assignments list endpoint (newest first, limit 50)"
```

### Task A6: Quick Phase 2 AC re-run

Phase 2 AC already verified with the previous code; this run confirms the answer-field addition didn't break anything.

- [ ] **Step 1: Restart server processes**

```bash
pkill -f "tsx watch src/(index|worker).ts" 2>&1 || true
sleep 1
cd /Users/admin/Desktop/Veda_ai/server
npm run dev > /tmp/api3.log 2>&1 &
npm run worker > /tmp/worker3.log 2>&1 &
sleep 6
tail -8 /tmp/api3.log /tmp/worker3.log
```

Expected: both processes show `[redis] connected`, `[mongo] connected`, and (API) `[api] listening` / (worker) `[worker] ready`.

- [ ] **Step 2: Live submit with unique title, verify answers in the stored paper**

```bash
UNIQ="P3 amendment $(date +%s)"
RES=$(curl -sS -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"$UNIQ\",\"numQuestions\":3,\"totalMarks\":9,\"questionTypes\":[\"mcq\"]}")
ID=$(echo "$RES" | jq -r .assignment._id)
echo "id=$ID"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  sleep 1
  S=$(curl -sS http://localhost:4000/api/assignments/$ID | jq -r .assignment.status)
  echo "  t+${i}s status=$S"
  if [ "$S" = "completed" ] || [ "$S" = "failed" ]; then break; fi
done
curl -sS http://localhost:4000/api/assignments/$ID | jq '.paper.sections[0].questions[0] | {text, difficulty, marks, type, answer}'
```

Expected: terminal state `completed`. The printed JSON has all 6 fields including a non-empty `answer` string.

- [ ] **Step 3: No commit (verification only).**

---

## Client foundation block

### Task C1: Install Tailwind, Zustand, icons, helpers

**Files:**
- Modify: `client/package.json` (via npm)

- [ ] **Step 1: Install runtime deps**

```bash
cd /Users/admin/Desktop/Veda_ai/client
npm install --legacy-peer-deps zustand@^4.5.0 lucide-react@^0.460.0 clsx@^2.1.1 date-fns@^4.1.0
npm install --legacy-peer-deps -D tailwindcss@^3.4.13 postcss@^8.4.49 autoprefixer@^10.4.20 @tailwindcss/forms@^0.5.9
```

Expected: install succeeds. Warnings about React 19 peer deps are OK.

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/package.json client/package-lock.json
git commit -m "chore(client): add tailwind, zustand, lucide-react, clsx, date-fns"
```

### Task C2: Configure Tailwind with design tokens

**Files:**
- Create: `client/tailwind.config.ts`
- Create: `client/postcss.config.mjs`
- Modify: `client/app/globals.css`
- Modify: `client/app/layout.tsx`

- [ ] **Step 1: Write `client/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#EAEBEB",
        card: "#FFFFFF",
        inset: "#F5F5F5",
        surface2: "#F0F0F0",
        primary: "#1A1A1A",
        secondary: "#7A7A7A",
        muted: "#A9A9A9",
        border: "#E5E5E5",
        dashed: "#D4D4D4",
        accent: "#F26B3A",
        accentSoft: "#FFE4D9",
        statusGreen: "#1AB45D",
        danger: "#E03131",
        diffEasy: "#1F8B4D",
        diffMedium: "#B86E00",
        diffHard: "#C7361C",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        cardLg: "0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04)",
        toolkitGlow: "0 0 0 1px rgba(242,107,58,0.6), 0 0 24px rgba(242,107,58,0.25)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/forms")({ strategy: "class" })],
};

export default config;
```

- [ ] **Step 2: Write `client/postcss.config.mjs`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Overwrite `client/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background: #EAEBEB;
  color: #1A1A1A;
  font-family: var(--font-inter), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Paper input lines (Name / Roll Number / Section in the output paper) */
.paper-line {
  border: 0;
  border-bottom: 1px solid #1A1A1A;
  background: transparent;
  outline: none;
  padding: 0 4px 2px 4px;
  min-width: 180px;
}

/* Hide native date input artifacts so our calendar icon is the only one */
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
}
```

- [ ] **Step 4: Overwrite `client/app/layout.tsx`**

```tsx
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "VedaAI",
  description: "AI Assessment Creator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-page text-primary min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `cd client && npx tsc --noEmit && npx next build 2>&1 | tail -20`
Expected: tsc clean; `next build` succeeds and shows the route table.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/tailwind.config.ts client/postcss.config.mjs client/app/globals.css client/app/layout.tsx
git commit -m "feat(client): tailwind setup with design tokens + Inter font"
```

### Task C3: Persona + cn helper

**Files:**
- Create: `client/lib/cn.ts`
- Create: `client/lib/persona.ts`

- [ ] **Step 1: Write `client/lib/cn.ts`**

```typescript
import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);
```

- [ ] **Step 2: Write `client/lib/persona.ts`**

```typescript
// Hardcoded persona used to match the Figma exactly.
// All strings here are placeholder content for the design.
// Replace with real auth/user data in a later phase.
export const persona = {
  user: {
    firstName: "Lakshya",
    displayName: "John Doe",
    avatarUrl: null as string | null,
  },
  school: {
    name: "Delhi Public School",
    location: "Bokaro Steel City",
    fullName: "Delhi Public School, Sector-4, Bokaro",
  },
  // Defaults for the printed paper meta row
  paperDefaults: {
    subject: "English",
    class: "5th",
    timeAllowed: "45 minutes",
  },
};
```

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/lib/cn.ts client/lib/persona.ts
git commit -m "feat(client): cn helper + hardcoded persona for Figma match"
```

### Task C4: Extend types for `answer` and add API helpers

**Files:**
- Modify: `client/types/index.ts`
- Modify: `client/lib/api.ts`

- [ ] **Step 1: Overwrite `client/types/index.ts`**

```typescript
export type AssignmentStatus = "pending" | "processing" | "completed" | "failed";

export interface AssignmentDTO {
  _id: string;
  title: string;
  dueDate?: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  text: string;
  difficulty: Difficulty;
  marks: number;
  type: string;
  answer: string;
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionPaperDTO {
  _id: string;
  assignmentId: string;
  sections: Section[];
  status: "completed" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Overwrite `client/lib/api.ts`**

```typescript
import type { AssignmentDTO, QuestionPaperDTO } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CreateAssignmentBody {
  title: string;
  numQuestions: number;
  totalMarks: number;
  questionTypes: string[];
  instructions?: string;
  dueDate?: string;
}

export async function createAssignment(
  body: CreateAssignmentBody
): Promise<
  | { ok: true; assignment: AssignmentDTO }
  | { ok: false; error: string; details?: unknown }
> {
  const res = await fetch(`${API}/api/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed", details: data.details };
  }
  return { ok: true, assignment: data.assignment };
}

export async function listAssignments(): Promise<AssignmentDTO[]> {
  const res = await fetch(`${API}/api/assignments`, { cache: "no-store" });
  if (!res.ok) throw new Error(`listAssignments failed: ${res.status}`);
  const data = (await res.json()) as { items: AssignmentDTO[] };
  return data.items;
}

export async function getAssignment(
  id: string
): Promise<{ assignment: AssignmentDTO; paper: QuestionPaperDTO | null }> {
  const res = await fetch(`${API}/api/assignments/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`getAssignment failed: ${res.status}`);
  return (await res.json()) as { assignment: AssignmentDTO; paper: QuestionPaperDTO | null };
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/types/index.ts client/lib/api.ts
git commit -m "feat(client): extend Question type with answer; add list + get helpers"
```

### Task C5: Zustand assignment store

**Files:**
- Create: `client/store/useAssignmentStore.ts`

- [ ] **Step 1: Write the store**

```typescript
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
  submit: () => Promise<{ ok: true; assignmentId: string } | { ok: false; error: string }>;
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

  submit: async () => {
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
    const res = await createAssignment(body);
    set({ submitting: false });
    if (!res.ok) {
      set({ submitError: res.error });
      return { ok: false, error: res.error };
    }
    return { ok: true, assignmentId: res.assignment._id };
  },

  reset: () => set({ form: initialForm, submitting: false, submitError: null }),
}));
```

- [ ] **Step 2: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/store/useAssignmentStore.ts
git commit -m "feat(client): zustand useAssignmentStore with form + validation + submit"
```

---

## UI primitives block

### Task C6: Button, Card, Stepper, ProgressBar, DifficultyText

**Files:**
- Create: `client/components/ui/Button.tsx`
- Create: `client/components/ui/Card.tsx`
- Create: `client/components/ui/Stepper.tsx`
- Create: `client/components/ui/ProgressBar.tsx`
- Create: `client/components/ui/DifficultyText.tsx`

- [ ] **Step 1: Write `Button.tsx`**

```tsx
"use client";
import { cn } from "../../lib/cn";

type Variant = "dark" | "ghost" | "white";
type Size = "sm" | "md";

export function Button({
  variant = "dark",
  size = "md",
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-6 text-sm",
        variant === "dark" && "bg-primary text-white hover:bg-black",
        variant === "white" && "bg-white text-primary border border-border hover:bg-inset",
        variant === "ghost" && "bg-transparent text-primary hover:bg-inset",
        className
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Write `Card.tsx`**

```tsx
import { cn } from "../../lib/cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("bg-card rounded-2xl shadow-card", className)}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write `Stepper.tsx`**

```tsx
"use client";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";

export function Stepper({
  value,
  min = 0,
  max = 99,
  onChange,
  className,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={dec}
        className="h-7 w-7 grid place-items-center rounded-full border border-border text-primary hover:bg-inset"
        aria-label="decrement"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        className="h-7 w-7 grid place-items-center rounded-full border border-border text-primary hover:bg-inset"
        aria-label="increment"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write `ProgressBar.tsx`**

```tsx
import { cn } from "../../lib/cn";

export function ProgressBar({
  step,
  total,
  className,
}: {
  step: number; // 1-indexed current step
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full gap-1.5", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i < step ? "bg-primary" : "bg-border"
          )}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `DifficultyText.tsx`**

```tsx
import type { Difficulty } from "../../types";
import { cn } from "../../lib/cn";

const LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Moderate",
  hard: "Challenging",
};

const COLOR: Record<Difficulty, string> = {
  easy: "text-diffEasy",
  medium: "text-diffMedium",
  hard: "text-diffHard",
};

export function DifficultyText({ value }: { value: Difficulty }) {
  return (
    <>
      [<span className={cn("font-medium", COLOR[value])}>{LABEL[value]}</span>]
    </>
  );
}
```

- [ ] **Step 6: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/ui/Button.tsx client/components/ui/Card.tsx client/components/ui/Stepper.tsx client/components/ui/ProgressBar.tsx client/components/ui/DifficultyText.tsx
git commit -m "feat(client): UI primitives — Button, Card, Stepper, ProgressBar, DifficultyText"
```

### Task C7: Brand icons + empty-state illustration

**Files:**
- Create: `client/components/icons/VedaLogo.tsx`
- Create: `client/components/icons/EmptyStateIllustration.tsx`

- [ ] **Step 1: Write `VedaLogo.tsx`** (the small dark square + V)

```tsx
export function VedaLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="VedaAI"
    >
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#1A1A1A" />
      <path
        d="M11 13 L20 28 L29 13"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Write `EmptyStateIllustration.tsx`** (paper + magnifier + X)

This is a hand-crafted SVG that visually approximates the Figma illustration. It's intentionally inline so there's no asset pipeline.

```tsx
export function EmptyStateIllustration({ size = 260 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No assignments yet"
    >
      <circle cx="160" cy="160" r="120" fill="#E8E8E8" />
      <rect x="100" y="80" width="120" height="150" rx="10" fill="#FFFFFF" stroke="#D0D0D0" />
      <rect x="115" y="100" width="50" height="8" rx="2" fill="#1A1A1A" />
      <rect x="115" y="120" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="132" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="144" width="70" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="156" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="168" width="60" height="4" rx="2" fill="#D0D0D0" />
      <circle cx="190" cy="190" r="44" fill="#F5F0FA" stroke="#C9B6E3" strokeWidth="3" />
      <line x1="222" y1="222" x2="250" y2="250" stroke="#C9B6E3" strokeWidth="8" strokeLinecap="round" />
      <line x1="176" y1="176" x2="204" y2="204" stroke="#E03131" strokeWidth="6" strokeLinecap="round" />
      <line x1="204" y1="176" x2="176" y2="204" stroke="#E03131" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 100 Q70 80 90 70" stroke="#1A1A1A" strokeWidth="2" fill="none" />
      <circle cx="80" cy="200" r="4" fill="#1F6BC0" />
      <path d="M240 80 l4 8 l8 -4 l-8 -4 z" fill="#1F6BC0" />
      <rect x="230" y="85" width="40" height="14" rx="4" fill="#FFFFFF" stroke="#D0D0D0" />
    </svg>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/icons/VedaLogo.tsx client/components/icons/EmptyStateIllustration.tsx
git commit -m "feat(client): brand logo + empty-state illustration svgs"
```

---

## Shell block

### Task C8: Sidebar

**Files:**
- Create: `client/components/layout/Sidebar.tsx`

- [ ] **Step 1: Write `Sidebar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FileText,
  BookOpen,
  Library,
  Settings,
  Sparkles,
} from "lucide-react";
import { VedaLogo } from "../icons/VedaLogo";
import { persona } from "../../lib/persona";
import { cn } from "../../lib/cn";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/groups", label: "My Groups", icon: <Users className="h-4 w-4" /> },
  { href: "/assignments", label: "Assignments", icon: <FileText className="h-4 w-4" /> },
  { href: "/toolkit", label: "AI Teacher's Toolkit", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/library", label: "My Library", icon: <Library className="h-4 w-4" /> },
];

export function Sidebar({ assignmentsCount }: { assignmentsCount?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex flex-col w-[270px] shrink-0 bg-card rounded-2xl shadow-card my-4 ml-4 p-4">
      <div className="flex items-center gap-3 px-2 py-1">
        <VedaLogo size={32} />
        <span className="font-bold text-lg">VedaAI</span>
      </div>

      <button
        type="button"
        className="mt-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary text-white shadow-toolkitGlow"
      >
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="font-semibold text-sm">AI Teacher's Toolkit</span>
      </button>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const count = item.label === "Assignments" ? assignmentsCount : undefined;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                active ? "bg-inset text-primary" : "text-primary/85 hover:bg-inset"
              )}
            >
              <span className="text-secondary">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {typeof count === "number" && count > 0 && (
                <span className="text-[11px] font-semibold text-white bg-accent rounded-full px-2 py-0.5">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-primary/85 hover:bg-inset"
        >
          <Settings className="h-4 w-4 text-secondary" />
          Settings
        </Link>
        <div className="flex items-center gap-3 bg-surface2 rounded-2xl p-3">
          <div className="h-9 w-9 rounded-full bg-inset grid place-items-center text-xs font-bold">
            DPS
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{persona.school.name}</div>
            <div className="text-xs text-secondary">{persona.school.location}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/layout/Sidebar.tsx
git commit -m "feat(client): desktop sidebar matching Figma (logo, AI Toolkit, nav, school card)"
```

### Task C9: Topbar + MobileShell + AppShell wrapper

**Files:**
- Create: `client/components/layout/Topbar.tsx`
- Create: `client/components/layout/MobileShell.tsx`
- Create: `client/components/layout/AppShell.tsx`
- Create: `client/app/(app)/layout.tsx`

- [ ] **Step 1: Write `Topbar.tsx`**

```tsx
"use client";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid } from "lucide-react";
import { useRouter } from "next/navigation";
import { persona } from "../../lib/persona";

export function Topbar({ breadcrumb }: { breadcrumb: string }) {
  const router = useRouter();
  return (
    <div className="mx-4 my-4 flex items-center justify-between bg-card rounded-full shadow-card px-3 py-2">
      <div className="flex items-center gap-3 pl-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="h-8 w-8 grid place-items-center rounded-md bg-inset">
          <LayoutGrid className="h-4 w-4 text-secondary" />
        </span>
        <span className="text-sm font-medium text-secondary">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-3 pr-1">
        <button
          type="button"
          className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2 pr-2">
          <div className="h-8 w-8 rounded-full bg-inset overflow-hidden grid place-items-center text-xs font-bold">
            JD
          </div>
          <span className="text-sm font-semibold">{persona.user.displayName}</span>
          <ChevronDown className="h-4 w-4 text-secondary" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write `MobileShell.tsx`**

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, LayoutGrid, FileText, Library, Sparkles } from "lucide-react";
import { VedaLogo } from "../icons/VedaLogo";
import { cn } from "../../lib/cn";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/assignments", label: "Assignments", icon: FileText },
  { href: "/library", label: "Library", icon: Library },
  { href: "/toolkit", label: "AI Toolkit", icon: Sparkles },
];

export function MobileHeader() {
  return (
    <div className="lg:hidden sticky top-0 z-10 bg-card rounded-2xl shadow-card mx-3 mt-3 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <VedaLogo size={28} />
        <span className="font-bold">VedaAI</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-inset" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="h-8 w-8 rounded-full bg-inset grid place-items-center text-xs font-bold">JD</div>
        <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-inset" aria-label="Menu">
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-20 bg-primary text-white rounded-full shadow-cardLg flex items-center justify-around py-2">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1 rounded-full text-[11px]",
              active ? "bg-white text-primary px-4" : "text-white/70"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Write `AppShell.tsx`**

```tsx
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileHeader, MobileTabs } from "./MobileShell";

export function AppShell({
  breadcrumb,
  assignmentsCount,
  children,
}: {
  breadcrumb: string;
  assignmentsCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page">
      <div className="flex">
        <Sidebar assignmentsCount={assignmentsCount} />
        <div className="flex-1 min-w-0">
          <div className="hidden lg:block">
            <Topbar breadcrumb={breadcrumb} />
          </div>
          <MobileHeader />
          <main className="px-3 lg:px-4 pb-24 lg:pb-4">{children}</main>
        </div>
      </div>
      <MobileTabs />
    </div>
  );
}
```

- [ ] **Step 4: Write `client/app/(app)/layout.tsx`**

```tsx
import { listAssignments } from "../../lib/api";
import { AppShell } from "../../components/layout/AppShell";

async function safeCount(): Promise<number> {
  try {
    const items = await listAssignments();
    return items.length;
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const count = await safeCount();
  return (
    <AppShell breadcrumb="Assignment" assignmentsCount={count}>
      {children}
    </AppShell>
  );
}
```

> Pages inside `(app)/` will override `breadcrumb` by rendering their own `<Topbar>` in the page if needed. For the standard cases the layout's default ("Assignment") matches the Figma.

- [ ] **Step 5: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/layout/Topbar.tsx client/components/layout/MobileShell.tsx client/components/layout/AppShell.tsx "client/app/(app)/layout.tsx"
git commit -m "feat(client): topbar, mobile shell, and (app) layout wrapping pages"
```

---

## Pages block

### Task C10: Dashboard empty-state page

**Files:**
- Modify: `client/app/page.tsx`
- Create: `client/components/ui/EmptyState.tsx`

- [ ] **Step 1: Write `EmptyState.tsx`**

```tsx
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "./Button";
import { EmptyStateIllustration } from "../icons/EmptyStateIllustration";

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto pt-12 lg:pt-24">
      <EmptyStateIllustration />
      <h2 className="mt-8 text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm text-secondary leading-6">{description}</p>
      <Link href={ctaHref} className="mt-8">
        <Button variant="dark">
          <Plus className="h-4 w-4" />
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Overwrite `client/app/page.tsx`** — make `/` redirect to the app-shelled empty state page.

This page is the home route. Per the design (ref-1) Home shows the empty state. We render through the `(app)` layout by simply redirecting to `/assignments` (which itself shows the empty state when there's nothing) — keeping Home and Assignments visually identical when there's no data, which matches the Figma. The route group `(app)/assignments/page.tsx` will own that rendering.

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/assignments");
}
```

- [ ] **Step 3: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/ui/EmptyState.tsx client/app/page.tsx
git commit -m "feat(client): EmptyState component + redirect home to /assignments"
```

### Task C11: Assignments list page + AssignmentCard

**Files:**
- Create: `client/components/ui/AssignmentCard.tsx`
- Create: `client/app/(app)/assignments/page.tsx`

- [ ] **Step 1: Write `AssignmentCard.tsx`**

```tsx
"use client";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useState } from "react";
import type { AssignmentDTO } from "../../types";
import { Card } from "./Card";

function fmt(d?: string) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
}

export function AssignmentCard({ a }: { a: AssignmentDTO }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <Card className="p-6 relative">
      <div className="flex items-start justify-between">
        <Link
          href={`/assignments/${a._id}`}
          className="text-xl font-bold underline underline-offset-4 decoration-2 text-primary"
        >
          {a.title}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="h-8 w-8 grid place-items-center rounded-full hover:bg-inset"
          aria-label="Card menu"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute top-12 right-6 bg-card shadow-cardLg rounded-xl py-2 w-44 z-10">
            <Link
              href={`/assignments/${a._id}`}
              className="block px-4 py-2 text-sm hover:bg-inset"
            >
              View Assignment
            </Link>
            <button className="block w-full text-left px-4 py-2 text-sm text-danger hover:bg-inset">
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="mt-10 flex items-center justify-between text-sm">
        <div>
          <span className="font-semibold">Assigned on</span>
          <span className="text-secondary"> : {fmt(a.createdAt)}</span>
        </div>
        <div>
          <span className="font-semibold">Due</span>
          <span className="text-secondary"> : {fmt(a.dueDate)}</span>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Write `client/app/(app)/assignments/page.tsx`**

```tsx
import Link from "next/link";
import { Filter, Plus, Search } from "lucide-react";
import { listAssignments } from "../../../lib/api";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AssignmentCard } from "../../../components/ui/AssignmentCard";

export const dynamic = "force-dynamic";

export default async function AssignmentsPage() {
  const items = await listAssignments().catch(() => []);

  if (items.length === 0) {
    return (
      <EmptyState
        title="No assignments yet"
        description="Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading."
        ctaHref="/assignments/new"
        ctaLabel="Create Your First Assignment"
      />
    );
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex items-start gap-3">
        <span className="h-3 w-3 rounded-full bg-statusGreen mt-2" />
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-secondary">Manage and create assignments for your classes.</p>
        </div>
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <button className="inline-flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-inset text-sm">
          <Filter className="h-4 w-4 text-secondary" />
          Filter By
        </button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 bg-inset rounded-full px-4 py-2">
            <Search className="h-4 w-4 text-secondary" />
            <input
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted"
              placeholder="Search Assignment"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((a) => (
          <AssignmentCard key={a._id} a={a} />
        ))}
      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 lg:bottom-8">
        <Link href="/assignments/new">
          <Button variant="dark">
            <Plus className="h-4 w-4" />
            Create Assignment
          </Button>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/ui/AssignmentCard.tsx "client/app/(app)/assignments/page.tsx"
git commit -m "feat(client): assignments list page with cards + filter/search + empty state"
```

### Task C12: FileDropzone + DateInput + Select + Textarea

**Files:**
- Create: `client/components/ui/FileDropzone.tsx`
- Create: `client/components/ui/DateInput.tsx`
- Create: `client/components/ui/Select.tsx`
- Create: `client/components/ui/Textarea.tsx`

- [ ] **Step 1: Write `FileDropzone.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";
import { CloudUpload } from "lucide-react";
import { Button } from "./Button";

export function FileDropzone({
  onFile,
  accept = "image/png,image/jpeg",
}: {
  onFile: (f: File | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);
  const [name, setName] = useState<string | null>(null);

  function pick(f: File | null) {
    setName(f?.name ?? null);
    onFile(f);
  }

  return (
    <>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files?.[0] ?? null;
          if (f) pick(f);
        }}
        className={
          "border border-dashed rounded-2xl py-12 px-6 bg-white text-center transition-colors " +
          (hover ? "border-primary bg-inset" : "border-dashed")
        }
      >
        <div className="grid place-items-center">
          <CloudUpload className="h-7 w-7 text-primary" />
        </div>
        <div className="mt-3 font-semibold">Choose a file or drag & drop it here</div>
        <div className="mt-1 text-xs text-muted">JPEG, PNG, upto 10MB</div>
        <div className="mt-4">
          <Button
            variant="white"
            size="sm"
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>
        {name && <div className="mt-3 text-xs text-secondary">Selected: {name}</div>}
      </div>
      <div className="mt-2 text-center text-xs text-secondary">
        Upload images of your preferred document/image
      </div>
    </>
  );
}
```

- [ ] **Step 2: Write `DateInput.tsx`**

```tsx
"use client";
import { Calendar } from "lucide-react";
import { cn } from "../../lib/cn";

export function DateInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="DD-MM-YYYY"
        className="form-input w-full h-12 rounded-xl bg-card border border-border pl-4 pr-12 text-sm placeholder:text-muted focus:border-primary focus:ring-0"
      />
      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3: Write `Select.tsx`**

```tsx
"use client";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";

export function Select({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: { label: string; value: string; typeKey: string }[];
  onChange: (label: string, value: string, typeKey: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => {
          const opt = options.find((o) => o.value === e.target.value);
          if (opt) onChange(opt.label, opt.value, opt.typeKey);
        }}
        className="form-select w-full h-11 rounded-xl bg-card border border-border pl-4 pr-10 text-sm focus:border-primary focus:ring-0 appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 4: Write `Textarea.tsx`**

```tsx
import { cn } from "../../lib/cn";

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        "form-textarea w-full rounded-xl bg-card border border-border p-4 text-sm placeholder:text-muted focus:border-primary focus:ring-0",
        className
      )}
    />
  );
}
```

- [ ] **Step 5: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/ui/FileDropzone.tsx client/components/ui/DateInput.tsx client/components/ui/Select.tsx client/components/ui/Textarea.tsx
git commit -m "feat(client): form primitives — FileDropzone, DateInput, Select, Textarea"
```

### Task C13: Create-assignment form page

**Files:**
- Create: `client/app/(app)/assignments/new/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
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
                  onChange={(label, value, typeKey) =>
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
```

- [ ] **Step 2: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: error because `GenerationOverlay` not yet written — proceed to Task C14 next.

### Task C14: Generation overlay (socket-driven)

**Files:**
- Create: `client/components/ui/GenerationOverlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { getSocket } from "../../lib/socket";
import { Button } from "./Button";
import type { AssignmentStatus, QuestionPaperDTO } from "../../types";

export function GenerationOverlay({
  assignmentId,
  onCompleted,
}: {
  assignmentId: string;
  onCompleted: (id: string) => void;
}) {
  const [status, setStatus] = useState<AssignmentStatus | "idle">("processing");
  const [label, setLabel] = useState<string>("Queued");
  const [pct, setPct] = useState<number>(5);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const subscribe = () => socket.emit("subscribe", assignmentId);
    if (socket.connected) subscribe();
    socket.on("connect", subscribe);

    const onStatus = (p: { assignmentId: string; status: AssignmentStatus }) => {
      if (p.assignmentId === assignmentId) setStatus(p.status);
    };
    const onProgress = (p: { assignmentId: string; progress: number; label: string }) => {
      if (p.assignmentId === assignmentId) {
        setPct(p.progress);
        setLabel(p.label);
      }
    };
    const onCompletedSocket = (p: { assignmentId: string; paper: QuestionPaperDTO }) => {
      if (p.assignmentId === assignmentId) {
        setStatus("completed");
        onCompleted(assignmentId);
      }
    };
    const onFailed = (p: { assignmentId: string; error: string }) => {
      if (p.assignmentId === assignmentId) {
        setStatus("failed");
        setError(p.error);
      }
    };

    socket.on("job:status", onStatus);
    socket.on("job:progress", onProgress);
    socket.on("job:completed", onCompletedSocket);
    socket.on("job:failed", onFailed);
    return () => {
      socket.off("connect", subscribe);
      socket.off("job:status", onStatus);
      socket.off("job:progress", onProgress);
      socket.off("job:completed", onCompletedSocket);
      socket.off("job:failed", onFailed);
    };
  }, [assignmentId, onCompleted]);

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-sm grid place-items-center z-30 px-4">
      <div className="bg-card rounded-3xl shadow-cardLg w-full max-w-md p-8">
        {status !== "failed" && (
          <>
            <div className="grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-inset grid place-items-center">
                <Sparkles className="h-5 w-5 text-accent animate-pulse" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-center">Generating your assignment…</h3>
            <p className="mt-1 text-sm text-secondary text-center">{label}</p>
            <div className="mt-6 h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(5, pct)}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-secondary">{pct}%</div>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="grid place-items-center">
              <div className="h-12 w-12 rounded-full bg-inset grid place-items-center">
                <AlertCircle className="h-6 w-6 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-center">Generation failed</h3>
            <p className="mt-1 text-sm text-secondary text-center break-words">
              {error ?? "Something went wrong."}
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="dark" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 3: Commit C13 + C14 together**

```bash
cd /Users/admin/Desktop/Veda_ai
git add "client/app/(app)/assignments/new/page.tsx" client/components/ui/GenerationOverlay.tsx
git commit -m "feat(client): create-assignment form + generation overlay (socket-driven)"
```

### Task C15: Output paper page

**Files:**
- Create: `client/components/ui/PaperBanner.tsx`
- Create: `client/components/ui/PaperHeader.tsx`
- Create: `client/components/ui/QuestionList.tsx`
- Create: `client/components/ui/AnswerKey.tsx`
- Create: `client/app/(app)/assignments/[id]/page.tsx`

- [ ] **Step 1: Write `PaperBanner.tsx`**

```tsx
import { Sparkles, Download } from "lucide-react";
import { Button } from "./Button";

export function PaperBanner({ message }: { message: string }) {
  return (
    <div className="bg-primary text-white rounded-3xl p-5 flex items-start gap-3 shadow-card">
      <Sparkles className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <Button variant="white" size="sm" type="button">
        <Download className="h-4 w-4" />
        Download as PDF
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Write `PaperHeader.tsx`**

```tsx
import { persona } from "../../lib/persona";

export function PaperHeader({ totalMarks }: { totalMarks: number }) {
  return (
    <div className="space-y-1 text-center">
      <h1 className="text-lg font-bold">{persona.school.fullName}</h1>
      <div className="text-sm">Subject: {persona.paperDefaults.subject}</div>
      <div className="text-sm">Class: {persona.paperDefaults.class}</div>
      <div className="mt-4 flex justify-between text-sm">
        <div>Time Allowed: {persona.paperDefaults.timeAllowed}</div>
        <div>Maximum Marks: {totalMarks}</div>
      </div>
      <p className="text-sm text-left mt-3">
        All questions are compulsory unless stated otherwise.
      </p>
      <div className="mt-3 text-sm text-left space-y-1">
        <div>
          Name: <input className="paper-line" type="text" />
        </div>
        <div>
          Roll Number: <input className="paper-line" type="text" />
        </div>
        <div>
          Class: {persona.paperDefaults.class}{" "}
          Section: <input className="paper-line" type="text" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `QuestionList.tsx`**

```tsx
import type { Section } from "../../types";
import { DifficultyText } from "./DifficultyText";

export function QuestionList({ section, indexStart }: { section: Section; indexStart: number }) {
  return (
    <div className="text-left space-y-2">
      <h3 className="text-base font-bold">{section.title}</h3>
      {section.instruction && (
        <p className="text-sm italic text-secondary">{section.instruction}</p>
      )}
      <ol className="space-y-2 text-sm pl-1">
        {section.questions.map((q, i) => (
          <li key={q.id} className="leading-6">
            <span className="font-medium">{indexStart + i}.</span>{" "}
            <DifficultyText value={q.difficulty} /> {q.text} [{q.marks} Marks]
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 4: Write `AnswerKey.tsx`**

```tsx
import type { Section } from "../../types";

export function AnswerKey({ sections }: { sections: Section[] }) {
  const flat = sections.flatMap((s) => s.questions);
  const hasAnyAnswer = flat.some((q) => q.answer && q.answer.length > 0);
  if (!hasAnyAnswer) return null;
  return (
    <div className="mt-10 text-left">
      <h3 className="text-base font-bold mb-2">Answer Key:</h3>
      <ol className="space-y-2 text-sm">
        {flat.map((q, i) => (
          <li key={q.id} className="leading-6">
            <span className="font-medium">{i + 1}.</span> {q.answer}
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 5: Write `client/app/(app)/assignments/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getAssignment } from "../../../../lib/api";
import { persona } from "../../../../lib/persona";
import { Card } from "../../../../components/ui/Card";
import { PaperBanner } from "../../../../components/ui/PaperBanner";
import { PaperHeader } from "../../../../components/ui/PaperHeader";
import { QuestionList } from "../../../../components/ui/QuestionList";
import { AnswerKey } from "../../../../components/ui/AnswerKey";

export const dynamic = "force-dynamic";

export default async function AssignmentPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getAssignment>>;
  try {
    data = await getAssignment(id);
  } catch {
    notFound();
  }
  if (!data.paper) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Card className="px-12 py-16 text-2xl font-bold text-primary">
          Created Assignments will appear here
        </Card>
      </div>
    );
  }

  const { assignment, paper } = data;
  const banner = `Certainly, ${persona.user.firstName}! Here are customized Question Paper for "${assignment.title}":`;

  // numbering continues across sections
  let runningIndex = 1;

  return (
    <div className="space-y-6 pt-2 pb-12">
      <PaperBanner message={banner} />
      <Card className="p-8 lg:p-12">
        <PaperHeader totalMarks={assignment.totalMarks} />
        <div className="mt-8 space-y-8">
          {paper.sections.map((section) => {
            const block = (
              <div key={section.id} className="space-y-4">
                <h2 className="text-base font-bold text-center">Section {section.id}</h2>
                <QuestionList section={section} indexStart={runningIndex} />
              </div>
            );
            runningIndex += section.questions.length;
            return block;
          })}
          <p className="text-center font-bold mt-6">End of Question Paper</p>
          <AnswerKey sections={paper.sections} />
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Smoke compile** — `cd client && npx tsc --noEmit`. Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/components/ui/PaperBanner.tsx client/components/ui/PaperHeader.tsx client/components/ui/QuestionList.tsx client/components/ui/AnswerKey.tsx "client/app/(app)/assignments/[id]/page.tsx"
git commit -m "feat(client): output paper page with banner, header, questions, answer key"
```

---

## Polish + verification block

### Task C16: Build, run, screenshot diff against references

- [ ] **Step 1: Stop any old client dev server, then start fresh**

```bash
pkill -f "next dev" 2>&1 || true
sleep 1
cd /Users/admin/Desktop/Veda_ai/client
NEXT_PUBLIC_API_URL=http://localhost:4000 NEXT_PUBLIC_SOCKET_URL=http://localhost:4000 \
  npx next dev -p 3000 > /tmp/client.log 2>&1 &
sleep 8
tail -20 /tmp/client.log
```

Expected: `Ready in <Xs>` and no compile errors. Visit http://localhost:3000.

- [ ] **Step 2: AC1 — Form pixel-match**

Open http://localhost:3000/assignments/new and compare to `client/design-reference/ref-6-create-form-desktop.png`. Manually verify (screenshot or eye):
- Sidebar layout matches (logo, Toolkit pill, nav, school card)
- Topbar matches (back, grid, "Assignment", bell + dot, John Doe)
- Green dot + "Create Assignment" header
- Two-segment progress bar (first dark)
- Dropzone with cloud icon, hint, Browse Files
- Due Date input with calendar icon
- Question Type table with 4 default rows
- Total Questions / Total Marks
- Previous / Next buttons

- [ ] **Step 3: AC2 — Validation blocks**

In the form, clear the title and click Next. Expect inline "Title is required" message, and no POST. Restore title; set all stepper values to 0; click Next. Expect a totals error.

- [ ] **Step 4: AC3 — Live progress**

Fill the form, click Next. Expect:
- Overlay appears with "Generating your assignment…" and an animating progress bar
- Status text updates: Queued → Building prompt → Calling AI → Validating output → Saving → Saved → Done
- On Done: navigate to `/assignments/<id>` with the paper rendered

- [ ] **Step 5: AC4 + AC5 — Paper match**

Compare the rendered page to `client/design-reference/ref-8-output-paper-desktop.png`:
- Dark banner with sparkle + AI message + "Download as PDF"
- White paper card with school header, subject/class, time/marks, student info inputs, Section A, instruction line, numbered questions with bracketed difficulties + marks, "End of Question Paper", Answer Key with answers

- [ ] **Step 6: AC6 — Mobile responsive**

Resize browser to 393px wide (or use device mode). Confirm:
- Sidebar hides; mobile header shows VedaAI + bell + avatar + ☰
- Bottom tab bar appears
- Form is single-column, scrolls
- Paper is single-column, readable

- [ ] **Step 7: AC7 — Cache hit still visible + failed state**

Submit the same form again. Overlay should jump to "Loaded from cache" then complete in <1s.

To verify failed state without breaking the backend: in DevTools console, run:
```js
fetch("http://localhost:4000/api/assignments", {
  method:"POST", headers:{"Content-Type":"application/json"},
  body: JSON.stringify({ title:"crash", numQuestions:3, totalMarks:9, questionTypes:["mcq"], instructions:"FORCE_FAIL_NONEXISTENT" })
}).then(r=>r.json()).then(console.log);
```
This won't actually fail — but we already verified the failure path in Phase 2. Skip live failed if the worker can't simulate it cleanly; otherwise force a worker exception manually for a moment.

- [ ] **Step 8: AC8 — Type sharing**

```bash
grep -rn "answer:" /Users/admin/Desktop/Veda_ai/client/types /Users/admin/Desktop/Veda_ai/client/components/ui/AnswerKey.tsx
```

Expected: confirms client uses the `answer: string` field that matches `server/src/types/questionPaper.ts`.

- [ ] **Step 9: Commit any small polish fixes**

```bash
cd /Users/admin/Desktop/Veda_ai
git status
# stage any tweaks you made during AC review, then:
git commit -m "fix(client): polish to match Figma reference" # only if needed
```

---

## Self-Review Notes

- **Spec coverage:**
  - File upload (cosmetic), due date, question types, num questions, marks, additional instructions → C13. ✓
  - Zustand `useAssignmentStore` → C5. ✓
  - Client validation matching server → C5 + C13. ✓
  - POST + Socket subscribe by id + progress + completed + failed → C13 + C14. ✓
  - Output: student info inputs, sections, instruction, questions with difficulty tag + marks, Answer Key → C15 (A1–A6 backend amendment for answers). ✓
  - Pixel-perfect to Figma → C2 (tokens), C6 + C7 (primitives), C8–C9 (shell), C10–C15 (pages). ✓
  - Mobile responsive → C9 (MobileShell) + lg: breakpoints throughout. ✓
  - Shared backend paper type → C4 (client types mirror server's `Question` with `answer`). ✓
  - GET fallback if socket missed → C15 page is a Server Component that fetches via `getAssignment` on mount. ✓
  - No raw AI output rendered → C15 reads validated `paper.sections[i].questions[j]` only. ✓

- **Naming consistency:** `useAssignmentStore` exports the methods C13 uses; `getAssignment` / `listAssignments` exist in C4 and are consumed in C10/C11/C15; `GenerationOverlay` is created in C14 and imported in C13.

- **Known trade-offs:**
  - The file upload is cosmetic (per the explicit decision) — `form.file` is captured in the store and not transmitted. Documented in `design-spec.md`.
  - The empty illustration SVG is a hand-drawn approximation; a true asset-perfect match would require an SVG export from the Figma (post rate-limit).
  - Hardcoded persona strings (Lakshya, DPS Bokaro, John Doe) live in `lib/persona.ts` so they're trivial to wire to real auth later.
  - The `(app)` layout fetches `listAssignments` on every navigation to compute the sidebar badge — Next will dedupe within a single navigation, but a future improvement is to push this into a client-side count store.
