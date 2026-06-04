import http from "node:http";
import { env } from "./config/env.js";
import { connectMongo } from "./config/db.js";
import { createApp } from "./app.js";
import { attachBusListener, initSocketServer } from "./sockets/io.js";

async function main(): Promise<void> {
  await connectMongo();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);
  attachBusListener();

  httpServer.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[api] received ${signal}, shutting down...`);
    httpServer.close();
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
  console.error("[api] fatal:", err);
  process.exit(1);
});
