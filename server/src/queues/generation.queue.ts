import { Queue, type ConnectionOptions } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const GENERATION_QUEUE = "generation";

export interface GenerationJobData {
  assignmentId: string;
}

// BullMQ bundles its own ioredis under node_modules/bullmq/node_modules/ioredis,
// giving its `Redis` a distinct nominal type from the project's ioredis at the
// type level only — they are runtime-identical. The cast is a typing escape hatch.
export const generationQueue = new Queue<GenerationJobData>(GENERATION_QUEUE, {
  connection: redisConnection as unknown as ConnectionOptions,
  defaultJobOptions: {
    attempts: 1,            // Phase 1: no retries — failures should surface fast
    removeOnComplete: 100,  // keep last 100 for visibility
    removeOnFail: 200,
  },
});
