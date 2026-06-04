import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { generationQueue } from "../queues/generation.queue.js";
import { CreateAssignmentSchema } from "../validation/assignment.schema.js";
import { requireAuth, attachAuth } from "../middleware/requireAuth.js";

export const assignmentsRouter = Router();

assignmentsRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);
    const assignment = await Assignment.create({
      ...data,
      userId: req.user!.sub,
      status: "pending",
    });

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

assignmentsRouter.get("/", attachAuth, async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (req.user?.sub) filter.userId = req.user.sub;
  const items = await Assignment.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ items });
});

assignmentsRouter.get("/:id", attachAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }
  const assignment = await Assignment.findById(id).lean();
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  // If the assignment has an owner, the requester must match.
  if (assignment.userId && (!req.user || assignment.userId.toString() !== req.user.sub)) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  const paper = await QuestionPaper.findOne({ assignmentId: id }).lean();
  return res.json({ assignment, paper: paper ?? null });
});

assignmentsRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }
  const assignment = await Assignment.findById(id);
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.userId && assignment.userId.toString() !== req.user!.sub) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  await QuestionPaper.deleteMany({ assignmentId: id });
  await Assignment.deleteOne({ _id: id });
  return res.json({ ok: true });
});

assignmentsRouter.post("/:id/regenerate", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }
  const assignment = await Assignment.findById(id);
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  if (assignment.userId && assignment.userId.toString() !== req.user!.sub) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  // Delete the existing paper so the worker can write a fresh one
  await QuestionPaper.deleteMany({ assignmentId: id });
  // Reset status
  assignment.status = "pending";
  await assignment.save();
  // Enqueue a new generation job. Use a fresh jobId because the old one is in BullMQ history.
  await generationQueue.add(
    "regenerate",
    { assignmentId: id },
    { jobId: `${id}-${Date.now()}` }
  );
  return res.json({ ok: true, assignmentId: id });
});
