import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import { isValidObjectId } from "mongoose";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadImageMemory } from "../lib/upload.js";

export const userRouter = Router();

// Separate public router for avatar bytes. <img src=...> can't send Bearer
// auth headers, and avatars are not sensitive data — anyone with the userId
// can view that user's avatar. Mounted at /api/users in index.ts/app.ts.
export const publicUserRouter = Router();

publicUserRouter.get("/users/:id/avatar", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).send();
  const user = await User.findById(id).select("avatarUrl updatedAt").lean();
  if (!user || !user.avatarUrl) return res.status(404).send();

  // The avatar is stored as a data URL "data:image/png;base64,<...>"
  const match = /^data:([^;]+);base64,(.+)$/.exec(user.avatarUrl);
  if (!match) return res.status(404).send();
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");

  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "public, max-age=300, must-revalidate");
  return res.send(buffer);
});

const UpdateMeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  school: z.string().trim().max(200).optional(),
});

userRouter.patch("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const data = UpdateMeSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user!.sub, data, { new: true }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        school: user.school,
      },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error("[PATCH /api/user/me] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Avatar upload — stores the image as a base64 data URL on the User document
// so it survives container restarts on ephemeral disks (Render free tier).
userRouter.post(
  "/me/avatar",
  requireAuth,
  uploadImageMemory.single("avatar"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const mime = req.file.mimetype || "image/png";
      const dataUrl = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
      const user = await User.findByIdAndUpdate(
        req.user!.sub,
        { avatarUrl: dataUrl },
        { new: true }
      ).lean();
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({
        avatarUrl: dataUrl,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          school: user.school,
        },
      });
    } catch (err) {
      console.error("[POST /api/user/me/avatar] error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
