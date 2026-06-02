import IORedis, { type Redis } from "ioredis";
import { env } from "./env.js";

// BullMQ requires maxRetriesPerRequest: null.
// We export a singleton so the queue and the worker share one connection per process.
export const redisConnection: Redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (err) => {
  console.error("[redis] error:", err.message);
});

redisConnection.on("connect", () => {
  console.log("[redis] connected:", env.REDIS_URL);
});
