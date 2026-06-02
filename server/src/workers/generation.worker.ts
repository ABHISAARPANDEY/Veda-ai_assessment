import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { redisConnection } from "../config/redis.js";
import { GENERATION_QUEUE, type GenerationJobData } from "../queues/generation.queue.js";
import { JobEventPublisher } from "../sockets/io.js";
import { fakeGenerate } from "./fakeGenerate.js";
import type { QuestionPaperDTO } from "../types/questionPaper.js";

const bus = new JobEventPublisher();

async function handle(job: Job<GenerationJobData>): Promise<void> {
  const { assignmentId } = job.data;
  console.log(`[worker] job ${job.id} starting for assignment ${assignmentId}`);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  // Mark processing + emit.
  assignment.status = "processing";
  await assignment.save();
  await bus.status({ assignmentId, status: "processing" });

  // Progress stages.
  await job.updateProgress(10);
  await bus.progress({ assignmentId, progress: 10, label: "Building prompt" });

  await job.updateProgress(40);
  await bus.progress({ assignmentId, progress: 40, label: "Generating Section A" });

  const { sections } = await fakeGenerate(assignment);

  await job.updateProgress(70);
  await bus.progress({ assignmentId, progress: 70, label: "Validating" });

  const paper = await QuestionPaper.create({
    assignmentId: assignment._id,
    sections,
    status: "completed",
  });

  assignment.status = "completed";
  await assignment.save();

  await job.updateProgress(100);
  await bus.progress({ assignmentId, progress: 100, label: "Done" });
  await bus.status({ assignmentId, status: "completed" });

  const paperDto: QuestionPaperDTO = {
    _id: paper._id.toString(),
    assignmentId: assignment._id!.toString(),
    sections: paper.sections as QuestionPaperDTO["sections"],
    status: "completed",
    createdAt: paper.get("createdAt").toISOString(),
    updatedAt: paper.get("updatedAt").toISOString(),
  };

  await bus.completed({ assignmentId, paper: paperDto });
  console.log(`[worker] job ${job.id} completed`);
}

export function startGenerationWorker(): Worker<GenerationJobData> {
  const worker = new Worker<GenerationJobData>(
    GENERATION_QUEUE,
    async (job) => {
      const assignmentId = job.data.assignmentId;
      try {
        await handle(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] job ${job.id} failed:`, message);
        // Mark failed in DB and record an error paper row for traceability.
        await Assignment.findByIdAndUpdate(assignmentId, { status: "failed" }).catch(() => {});
        await QuestionPaper.create({
          assignmentId,
          sections: [],
          status: "failed",
          error: message,
        }).catch(() => {});
        await bus.status({ assignmentId, status: "failed" });
        await bus.failed({ assignmentId, error: message });
        throw err; // let BullMQ record the failure
      }
    },
    {
      // Same cast pattern as generation.queue.ts — runtime-compatible, type-distinct.
      connection: redisConnection as unknown as ConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on("ready", () => console.log("[worker] ready"));
  worker.on("error", (err) => console.error("[worker] error:", err.message));
  return worker;
}
