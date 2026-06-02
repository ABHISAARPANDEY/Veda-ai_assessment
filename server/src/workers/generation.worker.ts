import { Worker, type ConnectionOptions, type Job } from "bullmq";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { redisConnection } from "../config/redis.js";
import { GENERATION_QUEUE, type GenerationJobData } from "../queues/generation.queue.js";
import { JobEventPublisher } from "../sockets/io.js";
import { generatePaper } from "./generatePaper.js";
import type { QuestionPaperDTO } from "../types/questionPaper.js";

const bus = new JobEventPublisher();

// Phase 2 progress map. The worker decides the percentage; labels come from
// generatePaper via a callback so AI-stage labels stay accurate even if the
// generation step changes.
const PCT_PROCESSING = 5;
const PCT_AFTER_GEN = 80;
const PCT_AFTER_SAVE = 95;
const PCT_DONE = 100;

async function handle(job: Job<GenerationJobData>): Promise<void> {
  const { assignmentId } = job.data;
  console.log(`[worker] job ${job.id} starting for assignment ${assignmentId}`);

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  assignment.status = "processing";
  await assignment.save();
  await bus.status({ assignmentId, status: "processing" });

  await job.updateProgress(PCT_PROCESSING);
  await bus.progress({ assignmentId, progress: PCT_PROCESSING, label: "Queued" });

  // generatePaper handles its own progress labels: "Building prompt", "Calling AI",
  // "Validating output", and "Loaded from cache" on a cache hit.
  const paper = await generatePaper(assignment, async (label) => {
    await bus.progress({ assignmentId, progress: PCT_PROCESSING, label });
  });

  await job.updateProgress(PCT_AFTER_GEN);
  await bus.progress({ assignmentId, progress: PCT_AFTER_GEN, label: "Saving" });

  const saved = await QuestionPaper.create({
    assignmentId: assignment._id,
    sections: paper.sections,
    status: "completed",
  });

  assignment.status = "completed";
  await assignment.save();

  await job.updateProgress(PCT_AFTER_SAVE);
  await bus.progress({ assignmentId, progress: PCT_AFTER_SAVE, label: "Saved" });

  const paperDto: QuestionPaperDTO = {
    _id: saved._id.toString(),
    assignmentId: assignment._id!.toString(),
    sections: saved.sections as QuestionPaperDTO["sections"],
    status: "completed",
    createdAt: saved.get("createdAt").toISOString(),
    updatedAt: saved.get("updatedAt").toISOString(),
  };

  await job.updateProgress(PCT_DONE);
  await bus.progress({ assignmentId, progress: PCT_DONE, label: "Done" });
  await bus.status({ assignmentId, status: "completed" });
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
        await Assignment.findByIdAndUpdate(assignmentId, { status: "failed" }).catch(() => {});
        await QuestionPaper.create({
          assignmentId,
          sections: [],
          status: "failed",
          error: message,
        }).catch(() => {});
        await bus.status({ assignmentId, status: "failed" });
        await bus.failed({ assignmentId, error: message });
        throw err;
      }
    },
    {
      connection: redisConnection as unknown as ConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on("ready", () => console.log("[worker] ready"));
  worker.on("error", (err) => console.error("[worker] error:", err.message));
  return worker;
}
