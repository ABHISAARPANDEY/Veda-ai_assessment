import express from "express";
import cors from "cors";
import path from "node:path";
import { env } from "./config/env.js";
import { assignmentsRouter } from "./routes/assignments.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { userRouter, publicUserRouter } from "./routes/user.routes.js";
import { groupsRouter } from "./routes/groups.routes.js";
import { apiRateLimit } from "./middleware/rateLimit.js";

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", apiRateLimit);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/assignments", assignmentsRouter);
  app.use("/api/groups", groupsRouter);
  app.use("/api/user", userRouter);
  app.use("/api", publicUserRouter);  // public avatar route /api/users/:id/avatar
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  return app;
}
