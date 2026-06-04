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
