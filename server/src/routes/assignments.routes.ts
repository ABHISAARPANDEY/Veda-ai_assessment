import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { generationQueue } from "../queues/generation.queue.js";
import { CreateAssignmentSchema } from "../validation/assignment.schema.js";

export const assignmentsRouter = Router();

assignmentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);
    const assignment = await Assignment.create({ ...data, status: "pending" });

    await generationQueue.add(
      "generate",
      { assignmentId: assignment._id!.toString() },
      { jobId: assignment._id!.toString() }
    );

    return res.status(201).json({ assignment });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.flatten(),
      });
    }
    console.error("[POST /api/assignments] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

assignmentsRouter.get("/", async (_req: Request, res: Response) => {
  const items = await Assignment.find().sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ items });
});

assignmentsRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }
  const assignment = await Assignment.findById(id).lean();
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  const paper = await QuestionPaper.findOne({ assignmentId: id }).lean();
  return res.json({ assignment, paper: paper ?? null });
});
