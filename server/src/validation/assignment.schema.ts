import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  dueDate: z.coerce.date().optional(),
  questionTypes: z
    .array(z.string().min(1))
    .min(1, "questionTypes must contain at least one type"),
  numQuestions: z
    .number({ invalid_type_error: "numQuestions must be a number" })
    .int("numQuestions must be an integer")
    .positive("numQuestions must be positive"),
  totalMarks: z
    .number({ invalid_type_error: "totalMarks must be a number" })
    .positive("totalMarks must be positive"),
  instructions: z.string().optional(),
  sourceText: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
