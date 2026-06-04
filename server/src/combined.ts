// Combined API + Worker entry point.
//
// Used in production on Render's free tier, where background-worker services
// require a paid plan. By co-locating the BullMQ worker in the same Node
// process as the Express API, we get the full pipeline (queue, retry, cache,
// Socket.IO room broadcasts) on the free web-service tier.
//
// In dev (`npm run dev` + `npm run worker`) we still split them for clarity
// and to mirror a paid production deploy where the worker scales separately.
//
// All other code (queue, sockets, mongo, redis) is shared — this entry point
// only changes WHERE the worker loop runs, not WHAT it does.

import http from "node:http";
import { env } from "./config/env.js";
import { connectMongo } from "./config/db.js";
import { createApp } from "./app.js";
import { attachBusListener, initSocketServer } from "./sockets/io.js";
import { startGenerationWorker } from "./workers/generation.worker.js";

async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);
  attachBusListener();

  const worker = startGenerationWorker();
  console.log("[combined] BullMQ worker running in same process as API");

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[combined] received ${signal}, shutting down...`);
    httpServer.close();
    await worker.close().catch(() => undefined);
    try {
      const mongoose = await import("mongoose");
      await mongoose.default.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[combined] fatal:", err);
  process.exit(1);
});
