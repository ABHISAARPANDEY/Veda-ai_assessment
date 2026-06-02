import { connectMongo } from "./config/db.js";
import { startGenerationWorker } from "./workers/generation.worker.js";

async function main(): Promise<void> {
  await connectMongo();
  const worker = startGenerationWorker();

  const shutdown = async () => {
    console.log("[worker] shutting down...");
    await worker.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[worker] started");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
