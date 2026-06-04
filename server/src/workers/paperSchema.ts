import { z } from "zod";

export const DifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const QuestionSchema = z.object({
  id: z.string().min(1).optional(),
  text: z.string().min(1, "question text is required"),
  difficulty: DifficultyEnum,
  marks: z.number().positive("marks must be positive"),
  type: z.string().min(1, "type is required"),
  answer: z.string().min(1, "answer is required"),
  options: z.array(z.string().min(1)).default([]),
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

const COUNT_TOLERANCE = 2;          // accept ±2 questions vs requested
const MARKS_TOLERANCE_PCT = 0.25;   // accept ±25% marks vs requested before retrying

/**
 * Loose validation — used to decide whether to retry the model.
 * If the model is roughly in the right ballpark we accept it and rely on
 * reconcilePaper() to fix exact totals afterwards.
 */
export function validatePaperAgainstAssignment(
  paper: GeneratedPaper,
  expected: { totalMarks: number; numQuestions: number }
): string[] {
  const issues: string[] = [];

  const allQuestions = paper.sections.flatMap((s) => s.questions);
  const marksSum = allQuestions.reduce((acc, q) => acc + q.marks, 0);

  const marksTol = Math.max(2, Math.ceil(expected.totalMarks * MARKS_TOLERANCE_PCT));
  if (Math.abs(marksSum - expected.totalMarks) > marksTol) {
    issues.push(
      `total marks across questions is ${marksSum}, expected approximately ${expected.totalMarks} (within ±${marksTol})`
    );
  }

  if (Math.abs(allQuestions.length - expected.numQuestions) > COUNT_TOLERANCE) {
    issues.push(
      `total question count is ${allQuestions.length}, expected approximately ${expected.numQuestions} (within ±${COUNT_TOLERANCE})`
    );
  }

  return issues;
}

/**
 * Auto-correct a validated paper so the total marks ALWAYS equal expected.totalMarks.
 * Rescales each question's marks proportionally, snaps to integers ≥1,
 * then applies any rounding drift to the last question so the sum is exact.
 * Question count is left as the model produced it (within tolerance).
 */
export function reconcilePaper(
  paper: GeneratedPaper,
  expected: { totalMarks: number }
): GeneratedPaper {
  const allQs = paper.sections.flatMap((s) => s.questions);
  if (allQs.length === 0) return paper;

  const currentSum = allQs.reduce((a, q) => a + q.marks, 0);
  if (currentSum === expected.totalMarks) return paper;

  // Proportional rescale, integer floor of at least 1
  const scale = expected.totalMarks / currentSum;
  let rescaled = allQs.map((q) => ({
    ...q,
    marks: Math.max(1, Math.round(q.marks * scale)),
  }));

  // Fix rounding drift so the total is EXACTLY expected.totalMarks
  let drift = expected.totalMarks - rescaled.reduce((a, q) => a + q.marks, 0);
  if (drift > 0) {
    // Add 1 mark to the lowest-marks questions until drift is consumed
    while (drift > 0) {
      const idxMin = rescaled.reduce(
        (best, q, i) => (q.marks < rescaled[best].marks ? i : best),
        0
      );
      rescaled[idxMin] = { ...rescaled[idxMin], marks: rescaled[idxMin].marks + 1 };
      drift--;
    }
  } else if (drift < 0) {
    // Subtract 1 mark from the highest-marks questions, never going below 1
    while (drift < 0) {
      const idxMax = rescaled.reduce(
        (best, q, i) => (q.marks > rescaled[best].marks ? i : best),
        0
      );
      if (rescaled[idxMax].marks <= 1) break; // safety
      rescaled[idxMax] = { ...rescaled[idxMax], marks: rescaled[idxMax].marks - 1 };
      drift++;
    }
  }

  // Reassemble into the original section structure
  let idx = 0;
  return {
    sections: paper.sections.map((s) => ({
      ...s,
      questions: s.questions.map(() => rescaled[idx++]),
    })),
  };
}
