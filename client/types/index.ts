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
