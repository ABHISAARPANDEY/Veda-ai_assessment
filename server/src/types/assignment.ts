export type AssignmentStatus = "pending" | "processing" | "completed" | "failed";

export interface AssignmentDTO {
  _id: string;
  title: string;
  dueDate?: string; // ISO
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}
