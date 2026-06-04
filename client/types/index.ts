export type AssignmentStatus = "pending" | "processing" | "completed" | "failed";

export interface AssignmentDTO {
  _id: string;
  title: string;
  dueDate?: string;
  questionTypes: string[];
  questionBreakdown?: { type: string; typeLabel: string; count: number; marksPerQuestion: number }[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
  classLevel?: string;
  subject?: string;
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
  answer: string;
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
