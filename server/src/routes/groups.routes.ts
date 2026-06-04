import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { z, ZodError } from "zod";
import { Group } from "../models/Group.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const groupsRouter = Router();

const StudentInput = z.object({
  name: z.string().trim().min(1, "student name is required"),
  rollNo: z.string().trim().optional().default(""),
});

const CreateGroupSchema = z.object({
  name: z.string().trim().min(1, "group name is required"),
  classLevel: z.string().trim().optional().default(""),
  students: z.array(StudentInput).optional().default([]),
});

const UpdateGroupSchema = z.object({
  name: z.string().trim().min(1).optional(),
  classLevel: z.string().trim().optional(),
  students: z.array(StudentInput).optional(),
});

groupsRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  const items = await Group.find({ userId: req.user!.sub })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return res.json({ items });
});

groupsRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = CreateGroupSchema.parse(req.body);
    const group = await Group.create({ ...data, userId: req.user!.sub });
    return res.status(201).json({ group });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error("[POST /api/groups]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

groupsRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid id" });
  const group = await Group.findById(id).lean();
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.userId.toString() !== req.user!.sub) {
    return res.status(404).json({ error: "Group not found" });
  }
  return res.json({ group });
});

groupsRouter.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid id" });
  try {
    const data = UpdateGroupSchema.parse(req.body);
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.userId.toString() !== req.user!.sub) {
      return res.status(404).json({ error: "Group not found" });
    }
    if (data.name !== undefined) group.name = data.name;
    if (data.classLevel !== undefined) group.classLevel = data.classLevel;
    if (data.students !== undefined) group.set("students", data.students);
    await group.save();
    return res.json({ group: group.toObject() });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error("[PATCH /api/groups/:id]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

groupsRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "Invalid id" });
  const group = await Group.findById(id);
  if (!group) return res.status(404).json({ error: "Group not found" });
  if (group.userId.toString() !== req.user!.sub) {
    return res.status(404).json({ error: "Group not found" });
  }
  await Group.deleteOne({ _id: id });
  return res.json({ ok: true });
});
