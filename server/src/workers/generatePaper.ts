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
