import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  dueDate: z.coerce.date().optional(),
  questionTypes: z
    .union([
      z.array(z.string().min(1)),
      z.string().transform((s, ctx) => {
        try {
          const parsed = JSON.parse(s);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "questionTypes must be a non-empty array",
            });
            return z.NEVER;
          }
          return parsed as string[];
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "questionTypes must be a JSON array string",
          });
          return z.NEVER;
        }
      }),
    ])
    .pipe(z.array(z.string().min(1)).min(1, "questionTypes must contain at least one type")),
  numQuestions: z.coerce
    .number({ invalid_type_error: "numQuestions must be a number" })
    .int("numQuestions must be an integer")
    .positive("numQuestions must be positive"),
  totalMarks: z.coerce
    .number({ invalid_type_error: "totalMarks must be a number" })
    .positive("totalMarks must be positive"),
  instructions: z.string().optional(),
  sourceText: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
