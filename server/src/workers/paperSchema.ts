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
