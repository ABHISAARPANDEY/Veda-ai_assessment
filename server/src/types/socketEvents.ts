import type { AssignmentStatus } from "./assignment.js";
import type { QuestionPaperDTO } from "./questionPaper.js";

export interface JobStatusPayload {
  assignmentId: string;
  status: AssignmentStatus;
}

export interface JobProgressPayload {
  assignmentId: string;
  progress: number; // 0-100
  label: string;
}

export interface JobCompletedPayload {
  assignmentId: string;
  paper: QuestionPaperDTO;
}

export interface JobFailedPayload {
  assignmentId: string;
  error: string;
}

// Channel name → payload map (string-typed for ergonomics).
export const SocketEvents = {
  Subscribe: "subscribe",
  JobStatus: "job:status",
  JobProgress: "job:progress",
  JobCompleted: "job:completed",
  JobFailed: "job:failed",
} as const;
