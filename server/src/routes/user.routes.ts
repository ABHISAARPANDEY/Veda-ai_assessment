import { Router, type Request, type Response } from "express";
import { z, ZodError } from "zod";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadImage, UPLOAD_URL_PREFIX } from "../lib/upload.js";

export const userRouter = Router();

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

userRouter.post("/me/avatar", requireAuth, uploadImage.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `${UPLOAD_URL_PREFIX}/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user!.sub, { avatarUrl: url }, { new: true }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ avatarUrl: url, user: { _id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, school: user.school } });
  } catch (err) {
    console.error("[POST /api/user/me/avatar] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});
