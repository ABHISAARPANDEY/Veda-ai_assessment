# AI Assessment Creator — Phase 2: Real AI Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `fakeGenerate` with real OpenAI `gpt-4o-mini` generation that returns strict-JSON, is Zod-validated before storage, retries once on bad output, and is Redis-cached by input hash. Pipeline architecture from Phase 1 unchanged.

**Architecture:** Inside the existing worker, swap the generation function. New flow: cache lookup → (miss) → prompt build → OpenAI call with `response_format: { type: "json_object" }` → parse + Zod-validate → on failure retry once with the validation error injected → on success save to Mongo and cache in Redis. Everything outside the generation function (queue, status transitions, Socket.IO events) stays identical.

**Tech Stack:** Existing Phase 1 stack + `openai@^4.x` SDK. Reuse shared `redisConnection` for the cache. No new infra.

---

## File Structure

**New files:**
- `server/src/config/openai.ts` — singleton OpenAI client; reads `OPENAI_API_KEY` from env.
- `server/src/workers/paperSchema.ts` — Zod schema for the generated paper + `marksSum === totalMarks` refinement. Source of truth for the typed paper.
- `server/src/workers/promptBuilder.ts` — pure function `buildPrompt(assignment)` → `{ system, user }`. Static system prompt (cache-friendly) + dynamic user prompt.
- `server/src/workers/paperCache.ts` — `cacheKey(input)` (sha256 over normalized JSON) + `getCachedPaper(key)` / `setCachedPaper(key, paper)` over the shared ioredis connection.
- `server/src/workers/generatePaper.ts` — orchestrates: cache check → prompt build → OpenAI call → parse + validate → retry-once on failure → return typed paper. Accepts a `progress(label)` callback so the worker can emit Socket.IO progress.

**Modified files:**
- `server/.env.example` — add `OPENAI_API_KEY=` and `OPENAI_MODEL=gpt-4o-mini`.
- `server/src/config/env.ts` — extend Zod schema with `OPENAI_API_KEY` (required, min 1) and `OPENAI_MODEL` (default `gpt-4o-mini`).
- `server/src/workers/generation.worker.ts` — replace `fakeGenerate` import/call with `generatePaper`; thread a progress callback; new labels per spec.
- `server/package.json` / `server/package-lock.json` — `openai@^4.65.0` dependency.

**Deleted files:**
- `server/src/workers/fakeGenerate.ts` — replaced by `generatePaper.ts`.

**Decomposition rationale:** Keep `paperSchema.ts`, `promptBuilder.ts`, `paperCache.ts` as small single-responsibility modules. `generatePaper.ts` is the orchestrator; the others are pure helpers. The worker file stays thin — it owns the BullMQ lifecycle, status transitions, and event emission, not generation logic.

---

## Task 1: Env config — add OPENAI_API_KEY + OPENAI_MODEL

**Files:**
- Modify: `server/.env.example`
- Modify: `server/src/config/env.ts`

- [ ] **Step 1: Update `.env.example`**

Append two lines:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Resulting file:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/veda
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

- [ ] **Step 2: Update `server/src/config/env.ts`**

```typescript
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
```

- [ ] **Step 3: Update local `.env`**

Append the two new lines to `server/.env` (mirroring `.env.example`). Leave `OPENAI_API_KEY=` empty for now — the user provides it before running.

> **Note:** `server/.env` is gitignored — do NOT commit it.

- [ ] **Step 4: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/.env.example server/src/config/env.ts
git commit -m "feat(server): add OPENAI_API_KEY + OPENAI_MODEL env vars"
```

---

## Task 2: Install `openai` SDK + central client

**Files:**
- Modify: `server/package.json` (via `npm install`)
- Create: `server/src/config/openai.ts`

- [ ] **Step 1: Install the SDK**

```bash
cd /Users/admin/Desktop/Veda_ai/server
npm install openai@^4.65.0
```

Expected: `openai` appears under `dependencies` in `package.json`; `package-lock.json` updated.

- [ ] **Step 2: Write `server/src/config/openai.ts`**

```typescript
import OpenAI from "openai";
import { env } from "./env.js";

// Singleton OpenAI client. Reused across jobs to avoid per-request handshake cost.
// IMPORTANT: set a billing cap in the OpenAI dashboard — the SDK does not enforce one.
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const OPENAI_MODEL = env.OPENAI_MODEL;
```

- [ ] **Step 3: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/package.json server/package-lock.json server/src/config/openai.ts
git commit -m "feat(server): install openai sdk + centralized client"
```

---

## Task 3: Zod paper schema with `marksSum === totalMarks` refinement

**Files:**
- Create: `server/src/workers/paperSchema.ts`

- [ ] **Step 1: Write the schema**

```typescript
import { z } from "zod";

export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const QuestionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z.string().min(1, "question text is required"),
  difficulty: DifficultyEnum,
  marks: z.number().positive("marks must be positive"),
  type: z.string().min(1, "type is required"),
});

export const SectionSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1, "section title is required"),
  instruction: z.string(),
  questions: z.array(QuestionSchema).min(1, "section must have at least one question"),
});

export const PaperSchema = z.object({
  sections: z.array(SectionSchema).min(1, "paper must have at least one section"),
});

export type GeneratedPaper = z.infer<typeof PaperSchema>;

/**
 * Validate that the sum of `marks` across all questions equals the assignment's totalMarks.
 * Returns a list of human-readable issues; empty array means valid.
 */
export function validatePaperAgainstAssignment(
  paper: GeneratedPaper,
  expected: { totalMarks: number; numQuestions: number }
): string[] {
  const issues: string[] = [];

  const allQuestions = paper.sections.flatMap((s) => s.questions);

  const marksSum = allQuestions.reduce((acc, q) => acc + q.marks, 0);
  if (marksSum !== expected.totalMarks) {
    issues.push(
      `total marks across questions is ${marksSum}, expected exactly ${expected.totalMarks}`
    );
  }

  if (allQuestions.length !== expected.numQuestions) {
    issues.push(
      `total question count is ${allQuestions.length}, expected exactly ${expected.numQuestions}`
    );
  }

  return issues;
}
```

> **Why two layers** (Zod + post-validation): the structural schema is reusable and gives a typed parse, while the post-validation needs the assignment to compare against. Splitting them keeps the Zod schema general.

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/paperSchema.ts
git commit -m "feat(server): zod paper schema + marks-sum/question-count validator"
```

---

## Task 4: Prompt builder

**Files:**
- Create: `server/src/workers/promptBuilder.ts`

- [ ] **Step 1: Write `server/src/workers/promptBuilder.ts`**

```typescript
import type { AssignmentDoc } from "../models/Assignment.js";

export interface PromptMessages {
  system: string;
  user: string;
}

/**
 * Static system prompt — kept identical across every call so OpenAI prompt caching
 * (~automatic for ≥1024 token static prefixes; see OpenAI docs) can amortise cost.
 *
 * The shape description here is the contract for the model's output. paperSchema.ts
 * is the runtime enforcement of that same contract.
 */
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
          "type": "<one of the requested question types, e.g. 'mcq', 'short', 'long'>"
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
- Each section must have at least one question.
- Question and section ids should be short and stable (e.g. "A", "B"; "A1", "A2", "B1").
- If source material is provided, base questions on it. Otherwise generate questions appropriate to the title/topic.`;

/**
 * Build a system + user message pair for the model.
 * Keeps the system prompt byte-identical across calls; user message carries the variable inputs.
 */
export function buildPrompt(assignment: AssignmentDoc & { _id: unknown }): PromptMessages {
  const userPayload = {
    title: assignment.title,
    questionTypes: assignment.questionTypes,
    numQuestions: assignment.numQuestions,
    totalMarks: assignment.totalMarks,
    instructions: assignment.instructions ?? "",
    dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 10) : null,
    sourceText: assignment.sourceText ?? null,
  };

  const user = [
    "Generate a question paper from these inputs:",
    JSON.stringify(userPayload, null, 2),
    "",
    "Respond with ONLY the JSON object described in the system message — no extra text.",
  ].join("\n");

  return { system: SYSTEM_PROMPT, user };
}
```

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/promptBuilder.ts
git commit -m "feat(server): structured prompt builder with cache-friendly system prompt"
```

---

## Task 5: `generatePaper` with retry (no cache yet)

**Files:**
- Create: `server/src/workers/generatePaper.ts`

- [ ] **Step 1: Write `server/src/workers/generatePaper.ts`**

```typescript
import type { AssignmentDoc } from "../models/Assignment.js";
import { openai, OPENAI_MODEL } from "../config/openai.js";
import { buildPrompt } from "./promptBuilder.js";
import {
  PaperSchema,
  validatePaperAgainstAssignment,
  type GeneratedPaper,
} from "./paperSchema.js";

export type ProgressFn = (label: string) => Promise<void> | void;

// Cap output to roughly 15 generously-sized questions. Tune downward for cost,
// upward only if you really need long-form papers. NOTE: also set a billing cap
// in the OpenAI dashboard — this only bounds a single call.
const MAX_OUTPUT_TOKENS = 4000;

/**
 * Call OpenAI once and return parsed + validated paper, or a list of issues.
 */
async function callOnce(
  assignment: AssignmentDoc & { _id: unknown },
  followupCorrection: string | null
): Promise<{ ok: true; paper: GeneratedPaper } | { ok: false; reason: string }> {
  const { system, user } = buildPrompt(assignment);

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  if (followupCorrection) {
    messages.push({
      role: "user",
      content:
        `Your previous response was invalid because: ${followupCorrection}\n` +
        `Return ONLY valid JSON matching the exact shape from the system message. ` +
        `Re-check that marks sum to ${assignment.totalMarks} and that there are exactly ${assignment.numQuestions} questions in total.`,
    });
  }

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages,
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: MAX_OUTPUT_TOKENS,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return { ok: false, reason: "model returned empty content" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `JSON.parse failed: ${msg}` };
  }

  const zodResult = PaperSchema.safeParse(parsed);
  if (!zodResult.success) {
    const flat = zodResult.error.flatten();
    return {
      ok: false,
      reason: `schema validation failed: ${JSON.stringify(flat.fieldErrors)}`,
    };
  }

  const semanticIssues = validatePaperAgainstAssignment(zodResult.data, {
    totalMarks: assignment.totalMarks,
    numQuestions: assignment.numQuestions,
  });
  if (semanticIssues.length > 0) {
    return { ok: false, reason: semanticIssues.join("; ") };
  }

  return { ok: true, paper: zodResult.data };
}

/**
 * Assign stable ids to sections and questions if the model omitted them.
 */
function assignStableIds(paper: GeneratedPaper): GeneratedPaper {
  const lettered = (i: number) => String.fromCharCode("A".charCodeAt(0) + i);
  return {
    sections: paper.sections.map((s, sIdx) => {
      const sectionId = s.id ?? lettered(sIdx);
      return {
        ...s,
        id: sectionId,
        questions: s.questions.map((q, qIdx) => ({
          ...q,
          id: q.id ?? `${sectionId}${qIdx + 1}`,
        })),
      };
    }),
  };
}

/**
 * Generate a question paper for an assignment using OpenAI. Validates strictly;
 * retries once with the validation error fed back as a correction; throws on
 * second failure (the worker's try/catch will convert that into a job:failed).
 */
export async function generatePaper(
  assignment: AssignmentDoc & { _id: unknown },
  progress: ProgressFn = async () => {}
): Promise<GeneratedPaper> {
  await progress("Building prompt");

  await progress("Calling AI");
  const first = await callOnce(assignment, null);
  if (first.ok) {
    await progress("Validating output");
    return assignStableIds(first.paper);
  }

  console.warn(`[generatePaper] first attempt failed: ${first.reason}`);

  await progress("Calling AI (retry)");
  const second = await callOnce(assignment, first.reason);
  if (second.ok) {
    await progress("Validating output");
    return assignStableIds(second.paper);
  }

  throw new Error(
    `paper generation failed twice; last error: ${second.reason} (first: ${first.reason})`
  );
}
```

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/generatePaper.ts
git commit -m "feat(server): openai paper generation with strict validation + single retry"
```

---

## Task 6: Wire into worker — replace fakeGenerate, update progress labels

**Files:**
- Modify: `server/src/workers/generation.worker.ts`

- [ ] **Step 1: Replace the existing worker with the new version**

```typescript
import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { redisConnection } from "../config/redis.js";
import { GENERATION_QUEUE, type GenerationJobData } from "../queues/generation.queue.js";
import { JobEventPublisher } from "../sockets/io.js";
import { generatePaper } from "./generatePaper.js";
import type { QuestionPaperDTO } from "../types/questionPaper.js";

const bus = new JobEventPublisher();

// Phase 2 progress map. The worker decides the percentage; labels come from
// generatePaper via a callback so AI-stage labels stay accurate even if the
// generation step changes.
const PCT_PROCESSING = 5;
const PCT_AFTER_GEN = 80;
const PCT_AFTER_SAVE = 95;
const PCT_DONE = 100;

async function handle(job: Job<GenerationJobData>): Promise<void> {
  const { assignmentId } = job.data;
  console.log(`[worker] job ${job.id} starting for assignment ${assignmentId}`);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  assignment.status = "processing";
  await assignment.save();
  await bus.status({ assignmentId, status: "processing" });

  await job.updateProgress(PCT_PROCESSING);
  await bus.progress({ assignmentId, progress: PCT_PROCESSING, label: "Queued" });

  // generatePaper handles its own progress labels: "Building prompt", "Calling AI",
  // "Validating output", and "Loaded from cache" on a cache hit.
  const paper = await generatePaper(assignment, async (label) => {
    await bus.progress({ assignmentId, progress: PCT_PROCESSING, label });
  });

  await job.updateProgress(PCT_AFTER_GEN);
  await bus.progress({ assignmentId, progress: PCT_AFTER_GEN, label: "Saving" });

  const saved = await QuestionPaper.create({
    assignmentId: assignment._id,
    sections: paper.sections,
    status: "completed",
  });

  assignment.status = "completed";
  await assignment.save();

  await job.updateProgress(PCT_AFTER_SAVE);
  await bus.progress({ assignmentId, progress: PCT_AFTER_SAVE, label: "Saved" });

  const paperDto: QuestionPaperDTO = {
    _id: saved._id.toString(),
    assignmentId: assignment._id!.toString(),
    sections: saved.sections as QuestionPaperDTO["sections"],
    status: "completed",
    createdAt: saved.get("createdAt").toISOString(),
    updatedAt: saved.get("updatedAt").toISOString(),
  };

  await job.updateProgress(PCT_DONE);
  await bus.progress({ assignmentId, progress: PCT_DONE, label: "Done" });
  await bus.status({ assignmentId, status: "completed" });
  await bus.completed({ assignmentId, paper: paperDto });

  console.log(`[worker] job ${job.id} completed`);
}

export function startGenerationWorker(): Worker<GenerationJobData> {
  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE,
    async (job) => {
      const assignmentId = job.data.assignmentId;
      try {
        await handle(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] job ${job.id} failed:`, message);
        await Assignment.findByIdAndUpdate(assignmentId, { status: "failed" }).catch(() => {});
        await QuestionPaper.create({
          assignmentId,
          sections: [],
          status: "failed",
          error: message,
        }).catch(() => {});
        await bus.status({ assignmentId, status: "failed" });
        await bus.failed({ assignmentId, error: message });
        throw err;
      }
    },
    {
      connection: redisConnection as unknown as ConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on("ready", () => console.log("[worker] ready"));
  worker.on("error", (err) => console.error("[worker] error:", err.message));
  return worker;
}
```

> **What changed vs Phase 1:** `fakeGenerate` import removed; `generatePaper` imported instead. Progress label flow is now driven by callbacks from `generatePaper`, with the worker adding `Queued`, `Saving`, `Saved`, `Done` around it. The percentage scale changed (no more 10/40/70/100 fakes) — generation-stage labels stay at `PCT_PROCESSING` percent so the bar doesn't jitter while the AI is working; the bar advances when persistence starts. Error handling and event emission are identical to Phase 1.

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/generation.worker.ts
git commit -m "feat(server): wire generatePaper into worker; phase-2 progress labels"
```

---

## Task 7: Delete `fakeGenerate.ts`

**Files:**
- Delete: `server/src/workers/fakeGenerate.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `cd /Users/admin/Desktop/Veda_ai && grep -rn "fakeGenerate" server/src`
Expected: no matches.

- [ ] **Step 2: Delete the file**

```bash
git rm server/src/workers/fakeGenerate.ts
```

- [ ] **Step 3: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git commit -m "chore(server): remove fakeGenerate (replaced by generatePaper)"
```

---

## Task 8: Redis cache helpers

**Files:**
- Create: `server/src/workers/paperCache.ts`

- [ ] **Step 1: Write `paperCache.ts`**

```typescript
import { createHash } from "node:crypto";
import { redisConnection } from "../config/redis.js";
import { PaperSchema, type GeneratedPaper } from "./paperSchema.js";

export interface CacheInput {
  title: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
}

const CACHE_PREFIX = "paper:cache:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24h

/**
 * Stable cache key derived from the meaningful inputs.
 * - title normalized to NFC + trimmed + collapsed whitespace + lowercased
 * - questionTypes sorted + deduped so order doesn't change the key
 * - other strings trimmed
 */
export function cacheKey(input: CacheInput): string {
  const normalized = {
    title: input.title.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase(),
    questionTypes: Array.from(new Set(input.questionTypes.map((t) => t.trim().toLowerCase()))).sort(),
    numQuestions: input.numQuestions,
    totalMarks: input.totalMarks,
    instructions: (input.instructions ?? "").trim(),
    sourceText: (input.sourceText ?? "").trim(),
  };
  const hash = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  return `${CACHE_PREFIX}${hash}`;
}

export async function getCachedPaper(key: string): Promise<GeneratedPaper | null> {
  const raw = await redisConnection.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = PaperSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function setCachedPaper(
  key: string,
  paper: GeneratedPaper
): Promise<void> {
  await redisConnection.set(key, JSON.stringify(paper), "EX", CACHE_TTL_SECONDS);
}
```

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/paperCache.ts
git commit -m "feat(server): redis paper cache (sha256 key, 24h TTL, shared connection)"
```

---

## Task 9: Integrate cache into `generatePaper`

**Files:**
- Modify: `server/src/workers/generatePaper.ts`

- [ ] **Step 1: Update `generatePaper.ts` to check + populate the cache**

Replace the file's final exported `generatePaper` function (everything else in the file stays the same — `callOnce`, `assignStableIds`, the `MAX_OUTPUT_TOKENS` constant, and the imports).

Update the imports block at the top of the file to add the cache helpers:

```typescript
import type { AssignmentDoc } from "../models/Assignment.js";
import { openai, OPENAI_MODEL } from "../config/openai.js";
import { buildPrompt } from "./promptBuilder.js";
import {
  PaperSchema,
  validatePaperAgainstAssignment,
  type GeneratedPaper,
} from "./paperSchema.js";
import { cacheKey, getCachedPaper, setCachedPaper } from "./paperCache.js";
```

Then replace the exported `generatePaper` function body with the cache-aware version:

```typescript
export async function generatePaper(
  assignment: AssignmentDoc & { _id: unknown },
  progress: ProgressFn = async () => {}
): Promise<GeneratedPaper> {
  await progress("Building prompt");

  const key = cacheKey({
    title: assignment.title,
    questionTypes: assignment.questionTypes,
    numQuestions: assignment.numQuestions,
    totalMarks: assignment.totalMarks,
    instructions: assignment.instructions,
    sourceText: assignment.sourceText,
  });

  const cached = await getCachedPaper(key);
  if (cached) {
    await progress("Loaded from cache");
    console.log(`[generatePaper] cache HIT for key ${key.slice(-12)}`);
    return assignStableIds(cached);
  }

  console.log(`[generatePaper] cache MISS for key ${key.slice(-12)} — calling OpenAI`);

  await progress("Calling AI");
  const first = await callOnce(assignment, null);
  if (first.ok) {
    await progress("Validating output");
    const finalized = assignStableIds(first.paper);
    await setCachedPaper(key, finalized);
    return finalized;
  }

  console.warn(`[generatePaper] first attempt failed: ${first.reason}`);

  await progress("Calling AI (retry)");
  const second = await callOnce(assignment, first.reason);
  if (second.ok) {
    await progress("Validating output");
    const finalized = assignStableIds(second.paper);
    await setCachedPaper(key, finalized);
    return finalized;
  }

  throw new Error(
    `paper generation failed twice; last error: ${second.reason} (first: ${first.reason})`
  );
}
```

- [ ] **Step 2: Smoke compile**

Run: `cd server && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/generatePaper.ts
git commit -m "feat(server): cache successful generations in redis (24h)"
```

---

## Task 10: Acceptance verification

This task runs the AC checklist. Do not skip — and report honestly when a check requires an OPENAI_API_KEY that may not be set on this machine.

- [ ] **Step 1: Confirm processes are healthy**

```bash
docker compose -f /Users/admin/Desktop/Veda_ai/docker-compose.yml ps
lsof -i :4000 -sTCP:LISTEN | head -2
ps aux | grep -E "tsx.*worker" | grep -v grep | head -2
```

Expected: mongo + redis containers up; API listening on 4000; worker process running.

If the API and worker are still running from Phase 1 with the old code, **restart them** so they pick up the new generatePaper module:

```bash
pkill -f "tsx watch src/(index|worker).ts"
cd server && npm run dev > /tmp/api.log 2>&1 &
cd server && npm run worker > /tmp/worker.log 2>&1 &
sleep 5
tail -5 /tmp/api.log /tmp/worker.log
```

Expected: both processes start without errors. If `OPENAI_API_KEY` is not set, the env validation will exit(1) — confirm with the user and stop.

- [ ] **Step 2: AC #1 + #2 + #3 + #4 — Real generation, validated, marks correct, difficulty in allowed set**

Submit one assignment:

```bash
curl -sS -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"title":"Photosynthesis primer","numQuestions":4,"totalMarks":10,"questionTypes":["mcq","short"]}' | tee /tmp/ac.json
ID=$(jq -r .assignment._id /tmp/ac.json)
echo "id=$ID"
sleep 12  # generous timeout for an OpenAI call
curl -sS http://localhost:4000/api/assignments/$ID | tee /tmp/ac-paper.json | jq '{status:.assignment.status, sections:(.paper.sections|length), totalMarks:(.paper.sections|map(.questions|map(.marks)|add)|add), difficulties:(.paper.sections|map(.questions|map(.difficulty))|flatten|unique)}'
```

Expected output (numbers will vary based on AI distribution but constraints must hold):

```
{
  "status": "completed",
  "sections": <integer ≥ 1>,
  "totalMarks": 10,           <-- must equal the requested totalMarks
  "difficulties": ["easy", "medium", "hard"]  <-- only these values
}
```

Also confirm in mongo that the stored paper has no raw model string anywhere:

```bash
docker exec veda-mongo mongosh veda --quiet --eval "
  const p = db.questionpapers.findOne({assignmentId: ObjectId('$ID')});
  print('sections present:', !!p?.sections);
  print('first question shape:', JSON.stringify(Object.keys(p.sections[0].questions[0])));
"
```

Expected:
```
sections present: true
first question shape: ["id","text","difficulty","marks","type","_id"]   (or without _id; never raw text blob)
```

- [ ] **Step 3: AC #5 — Cache hit on identical second submission**

Submit the SAME payload again and watch the worker log for the cache HIT line.

```bash
curl -sS -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"title":"Photosynthesis primer","numQuestions":4,"totalMarks":10,"questionTypes":["mcq","short"]}' | jq -r .assignment._id | tee /tmp/ac2.id
sleep 4   # cache hit needs much less time than an OpenAI call
tail -25 /tmp/worker.log | grep -E "cache (HIT|MISS)" | tail -2
```

Expected: tail contains `cache HIT for key <suffix>` for the second submission (first submission may have shown `MISS` then a new entry).

Also confirm via redis-cli:

```bash
docker exec veda-redis redis-cli --scan --pattern "paper:cache:*" | head -5
```

Expected: at least one `paper:cache:<sha256hex>` key present.

- [ ] **Step 4: AC #6 — Retry path verification**

Verify the retry by code reading OR by an explicit ad-hoc test. The clean approach is a tsx script that monkey-patches `openai.chat.completions.create` to return a bad payload first, then a good one.

Create `server/retry-test.ts` (gitignored — delete after):

```typescript
import { openai } from "./src/config/openai.js";
import { generatePaper } from "./src/workers/generatePaper.js";

const original = openai.chat.completions.create.bind(openai.chat.completions);
let calls = 0;
(openai.chat.completions as any).create = async (args: any) => {
  calls++;
  if (calls === 1) {
    return {
      choices: [{ message: { content: "not valid json {" } }],
    };
  }
  return original(args);
};

// Pretend Assignment doc
const fake = {
  _id: "deadbeefdeadbeefdeadbeef",
  title: "Retry path test",
  questionTypes: ["mcq", "short"],
  numQuestions: 3,
  totalMarks: 6,
  instructions: "",
  sourceText: undefined,
  dueDate: undefined,
} as any;

try {
  const paper = await generatePaper(fake, async (l) => console.log("[progress]", l));
  console.log("DONE — total OpenAI calls:", calls, "sections:", paper.sections.length);
  process.exit(0);
} catch (err) {
  console.error("FAILED:", err);
  process.exit(1);
}
```

Add `retry-test.ts` to `server/.gitignore` (single line) so it never gets committed. Run:

```bash
cd server
echo "retry-test.ts" >> .gitignore
npx tsx retry-test.ts
```

Expected output sequence (subject to OpenAI succeeding on the second real call):

```
[progress] Building prompt
[progress] Calling AI
[progress] Calling AI (retry)
[progress] Validating output
DONE — total OpenAI calls: 2 sections: <integer>
```

Then remove the test file:

```bash
rm server/retry-test.ts
```

Revert the gitignore edit:

```bash
cd /Users/admin/Desktop/Veda_ai
git checkout server/.gitignore   # only if you committed it; otherwise just edit it back
```

- [ ] **Step 5: AC #7 — Architecture unchanged**

Confirm:
- `git log --oneline server/src/index.ts` — no commits in Phase 2 (API entry unchanged).
- `git log --oneline server/src/queues/` — no commits in Phase 2.
- `git log --oneline server/src/routes/` — no commits in Phase 2.
- `git log --oneline server/src/sockets/` — no commits in Phase 2.

Expected: only `workers/`, `config/`, `.env.example`, `package*.json` show Phase 2 commits. API still doesn't block (POST still returns 201 immediately, observable by timing in AC#2).

- [ ] **Step 6: Self-review**

- All Phase-2 commits are scoped per task.
- No `any` on the parsed AI response — the parsed JSON flows through `PaperSchema.safeParse` to a `GeneratedPaper` typed value before saving or emitting.
- `OPENAI_API_KEY` is not logged anywhere (`grep -rn "OPENAI_API_KEY" server/src` should only return `config/env.ts` and `config/openai.ts`).
- `git status` clean.

---

## Self-Review Notes

- **Spec coverage:**
  - "Use gpt-4o-mini, env var, no hardcode, central client" → Tasks 1, 2. ✓
  - "Never render raw AI output: prompt → strict JSON → parse → Zod validate" → Tasks 3, 4, 5. ✓
  - "Structured prompt builder" → Task 4. ✓
  - "Strict schema with marks-sum refinement" → Task 3 (`validatePaperAgainstAssignment`). ✓
  - "Generation with validation + single retry that injects the validation error" → Task 5 (`callOnce` + retry, then merged with cache in Task 9). ✓
  - "Wire into worker; new progress labels" → Task 6. ✓
  - "Redis caching: stable hash key, 24h TTL, shared connection, 'Loaded from cache' label" → Tasks 8, 9. ✓
  - "Cost safety: max_tokens, dashboard cap comment" → Task 5 (`MAX_OUTPUT_TOKENS`), Task 2 (`openai.ts` comment). ✓
  - "Reuse types across worker/models/client" → `GeneratedPaper` (Zod-inferred) is the worker's type; the existing `QuestionPaperDTO` already mirrors the same shape (Phase 1) and the client mirrors it again. ✓
  - "Pipeline architecture unchanged" → Only `workers/`, `config/`, env, deps changed (verified in Task 10 Step 5). ✓
  - "Commit in logical chunks" → 9 commits across Tasks 1–9 (each task has its own commit). ✓

- **Naming consistency:**
  - `GeneratedPaper`, `PaperSchema`, `validatePaperAgainstAssignment` (Task 3) used unchanged in Tasks 5, 9. ✓
  - `cacheKey`, `getCachedPaper`, `setCachedPaper` (Task 8) used unchanged in Task 9. ✓
  - `OPENAI_MODEL` constant (Task 2) used in Task 5's `callOnce`. ✓
  - Cache key prefix `paper:cache:` (Task 8) referenced in Task 10 redis-cli scan. ✓

- **Known trade-offs:**
  - Progress percentage doesn't animate during the AI call — only label changes. That matches the spec (labels) and avoids a fake-progress bar lying to the user.
  - `temperature: 0.4` is a balance: cooler is more deterministic (better for cache hits with slightly varied prompts; same inputs already cache by hash) but reduces question variety. Tunable.
  - The retry test in Task 10 Step 4 uses an ad-hoc tsx script that monkey-patches the SDK. An alternative is a vitest with a mock — would require adding a test framework. For a single verification this is overkill; the script is deleted after.
