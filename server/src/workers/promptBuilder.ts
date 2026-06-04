import type { AssignmentDoc } from "../models/Assignment.js";

export interface PromptMessages {
  system: string;
  user: string;
}

const SYSTEM_PROMPT = `You are an exam question paper generator for school teachers.

Output rules (these are not optional):
- Respond with ONLY valid JSON. No markdown fences, no commentary, no prose around it.
- Match this exact JSON shape:
{
  "sections": [
    {
      "id": "A",
      "title": "Section A — <topical name OR the question-type label>",
      "instruction": "<one-line instruction such as 'Attempt all questions.'>",
      "questions": [
        {
          "id": "A1",
          "text": "<the full question>",
          "difficulty": "easy" | "medium" | "hard",
          "marks": <positive number>,
          "type": "<backend key e.g. 'mcq', 'short', 'diagram', 'numerical', 'long'>",
          "options": ["<option a>", "<option b>", "<option c>", "<option d>"],
          "answer": "<the correct answer; for mcq, name the correct option, e.g. 'The correct answer is (b) ...'>"
        }
      ]
    }
  ]
}

Generation rules:
- If a "questionBreakdown" field is provided in the user message, you MUST create ONE SECTION PER ENTRY in the breakdown, in the order given. Each section should:
  - Have a title that matches the entry's "typeLabel" (e.g. "Section A — Multiple Choice Questions")
  - Contain EXACTLY the entry's "count" questions
  - Set every question's "type" field to the entry's "type"
  - Set every question's "marks" to the entry's "marksPerQuestion"
- If "questionBreakdown" is NOT provided, fall back to generating EXACTLY the requested numQuestions distributed across logical sections, with marks summing to totalMarks.
- For every question with type "mcq", the "options" array MUST contain EXACTLY 4 plausible option strings (no leading "(a)" or "a)" prefixes — just the option text; the UI will render the (a)-(d) labels). The "answer" field for mcq must clearly identify the correct option (e.g., "The correct answer is (b) Newton" or "(c) — because…").
- For all OTHER question types (short, long, diagram, numerical), set "options" to an empty array [].
- If "classLevel" is provided (e.g. "Class 5", "Class 12", "JEE Main", "JEE Advanced", "NEET"), calibrate question difficulty and depth to that level. If "subject" is provided, ensure questions stay within that subject area.
- Every "difficulty" value must be exactly one of: "easy", "medium", "hard". No other values.
- Each question must have non-empty "text" and a non-empty "answer" (correct answer, 1-3 sentences).
- Each section must have at least one question.
- Question and section ids should be short and stable (e.g. "A", "B"; "A1", "A2", "B1").
- If source material is provided (look for "sourceText"), use it as the authoritative basis. For a textbook, distribute questions across the document — don't draw them all from page 1.`;

export function buildPrompt(assignment: AssignmentDoc & { _id: unknown }): PromptMessages {
  const breakdown = (assignment as { questionBreakdown?: unknown[] }).questionBreakdown ?? [];
  const userPayload = {
    title: assignment.title,
    subject: assignment.subject ?? "",
    classLevel: assignment.classLevel ?? "",
    questionTypes: assignment.questionTypes,
    questionBreakdown: breakdown,
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
