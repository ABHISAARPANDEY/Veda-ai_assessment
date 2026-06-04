import { afterAll, beforeAll, vi } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

// Force test-friendly env BEFORE config/env.ts parses it
process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT ?? "4001";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "sk-test-not-used-stubbed-anyway";
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-min-32-chars-for-tests";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "1h";

// Stub OpenAI module so no network calls are made
vi.mock("openai", () => {
  class OpenAI {
    apiKey: string;
    constructor(opts: { apiKey: string }) {
      this.apiKey = opts.apiKey;
    }
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sections: [
                    {
                      id: "A",
                      title: "Section A — Test",
                      instruction: "Attempt all questions.",
                      questions: [
                        {
                          id: "A1",
                          text: "What is 1 + 1?",
                          difficulty: "easy",
                          marks: 1,
                          type: "mcq",
                          options: ["1", "2", "3", "4"],
                          answer: "Correct: (b) 2. The sum 1+1 equals 2.",
                        },
                      ],
                    },
                  ],
                }),
              },
            },
          ],
        })),
      },
    };
  }
  return { default: OpenAI };
});

// Stub BullMQ Queue so no Redis connection is required during tests
vi.mock("bullmq", () => {
  class Queue {
    constructor(_name: string, _opts?: unknown) {}
    async add(_name: string, _data: unknown, _opts?: unknown) {
      return { id: "test-job-id" };
    }
    async close() {}
  }
  class Worker {
    constructor(_name: string, _processor: unknown, _opts?: unknown) {}
    async close() {}
  }
  return { Queue, Worker };
});

// Stub ioredis so no Redis connection is attempted
vi.mock("ioredis", () => {
  class IORedis {
    constructor(_url?: string, _opts?: unknown) {}
    on(_event: string, _handler: unknown) { return this; }
    subscribe(_channel: string, _cb?: unknown) {}
    publish(_channel: string, _message: string) {}
    disconnect() {}
  }
  return { default: IORedis };
});

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
});

afterAll(async () => {
  if (mongoServer) await mongoServer.stop();
});
