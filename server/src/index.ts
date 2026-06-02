import http from "node:http";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectMongo } from "./config/db.js";
import { assignmentsRouter } from "./routes/assignments.routes.js";
import { attachBusListener, initSocketServer } from "./sockets/io.js";

async function main(): Promise<void> {
  await connectMongo();

  const app = express();
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/assignments", assignmentsRouter);

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);
  attachBusListener();

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
