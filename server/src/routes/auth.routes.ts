import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { User } from "../models/User.js";
import { signJwt } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRouter = Router();

const SignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("invalid email"),
  password: z.string().min(8, "password must be at least 8 chars"),
  name: z.string().trim().min(1, "name is required"),
});

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("invalid email"),
  password: z.string().min(1, "password is required"),
});

authRouter.post("/signup", authRateLimit, async (req: Request, res: Response) => {
  try {
    const data = SignupSchema.parse(req.body);
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      email: data.email,
      passwordHash,
      name: data.name,
    });
    const token = signJwt({ sub: user._id.toString(), email: user.email });
    return res.status(201).json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, school: user.school },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error("[POST /api/auth/signup]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.post("/login", authRateLimit, async (req: Request, res: Response) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await User.findOne({ email: data.email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signJwt({ sub: user._id.toString(), email: user.email });
    return res.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, school: user.school },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error("[POST /api/auth/login]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.sub).lean();
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({
    user: { _id: user._id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, school: user.school },
  });
});
