# AI Assessment Creator — Phase 1: Foundation & Real-time Job Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a monorepo (Next.js client + Express/Node server) with a working end-to-end pipeline — API → BullMQ queue → background worker → MongoDB → Socket.IO push to a live client — using a *fake* hardcoded generator (no AI).

**Architecture:** Two-process server (Express API + standalone BullMQ worker) sharing a single Redis connection. POST creates an Assignment, enqueues a job, returns immediately. Worker picks up the job, walks status/progress through Socket.IO (rooms keyed by `assignmentId`), persists a `QuestionPaper`, emits a completion event. Client connects, subscribes to its own assignment room, renders status/progress/result live.

**Tech Stack:** TypeScript end-to-end. Server: Node 20, Express 4, Mongoose 8, BullMQ 5, ioredis 5, Socket.IO 4, Zod 3, tsx. Client: Next.js 15 (App Router), socket.io-client 4. Infra: docker-compose with MongoDB 7 + Redis 7.

---

## File Structure

```
/docker-compose.yml          - mongo + redis
/README.md                   - how to run everything
/.gitignore
/docs/superpowers/plans/     - this plan
/server
  /src
    /config
      env.ts                 - load + validate env with Zod
      db.ts                  - mongoose connect helper
      redis.ts               - shared ioredis instance
    /models
      Assignment.ts          - Mongoose model + ts interface
      QuestionPaper.ts       - Mongoose model + ts interface
    /queues
      generation.queue.ts    - BullMQ Queue for "generation"
    /workers
      fakeGenerate.ts        - hardcoded paper generator + sleep
      generation.worker.ts   - Worker handler (status, progress, save, emit)
    /routes
      assignments.routes.ts  - POST /api/assignments, GET /:id
    /sockets
      io.ts                  - Socket.IO server + emitter helpers
    /types
      assignment.ts          - shared Assignment TS interface
      questionPaper.ts       - shared QuestionPaper TS interface
      socketEvents.ts        - typed socket event payloads
    /validation
      assignment.schema.ts   - Zod schema for POST body
    index.ts                 - Express + Socket.IO bootstrap (API process)
    worker.ts                - standalone worker bootstrap process
  package.json
  tsconfig.json
  .env.example
  .gitignore
/client
  /app
    layout.tsx               - root layout
    page.tsx                 - the form + live view (only page this phase)
  /lib
    socket.ts                - socket.io-client wrapper
    api.ts                   - fetch wrapper for POST + GET
  /types
    index.ts                 - mirrored shared types
  package.json
  tsconfig.json
  next.config.mjs
  .env.example
```

**Decomposition rationale:** API process (`index.ts`) and Worker process (`worker.ts`) are intentionally separate entrypoints to mirror real deployment. They share `config/`, `models/`, `types/`, and `sockets/io.ts` (the worker uses a Socket.IO `Server` instance — single-process bootstrap in this phase; documented as a known limitation to revisit in Phase 2 with a Redis adapter).

---

## Task 1: Initialize repo, gitignore, docker-compose

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/.gitignore`
- Create: `/Users/admin/Desktop/Veda_ai/docker-compose.yml`
- Create: `/Users/admin/Desktop/Veda_ai/README.md` (skeleton — will be filled in Task 14)

- [ ] **Step 1: Initialize git**

```bash
cd /Users/admin/Desktop/Veda_ai
git init -b main
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# deps
node_modules/
# build outputs
dist/
.next/
out/
# env
.env
.env.local
# logs
*.log
npm-debug.log*
yarn-debug.log*
# OS
.DS_Store
# editor
.vscode/
.idea/
# data volumes (docker)
.data/
```

- [ ] **Step 3: Write `docker-compose.yml`**

```yaml
services:
  mongo:
    image: mongo:7
    container_name: veda-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    container_name: veda-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: ["redis-server", "--appendonly", "yes"]

volumes:
  mongo_data:
  redis_data:
```

- [ ] **Step 4: Write skeleton README**

```markdown
# AI Assessment Creator

Phase 1 scaffold: end-to-end real-time job pipeline using a fake generator.

(Detailed run instructions added in Task 14.)
```

- [ ] **Step 5: Verify docker-compose syntax**

Run: `docker compose -f /Users/admin/Desktop/Veda_ai/docker-compose.yml config`
Expected: Prints the resolved config with no errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add .gitignore docker-compose.yml README.md
git commit -m "chore: init repo with docker-compose (mongo + redis)"
```

---

## Task 2: Scaffold server package + TypeScript config

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/package.json`
- Create: `/Users/admin/Desktop/Veda_ai/server/tsconfig.json`
- Create: `/Users/admin/Desktop/Veda_ai/server/.env.example`
- Create: `/Users/admin/Desktop/Veda_ai/server/.gitignore`

- [ ] **Step 1: Create server directory and package.json**

```bash
mkdir -p /Users/admin/Desktop/Veda_ai/server/src
```

`server/package.json`:

```json
{
  "name": "veda-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "worker": "tsx watch src/worker.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "start:worker": "node dist/worker.js"
  },
  "dependencies": {
    "bullmq": "^5.13.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "ioredis": "^5.4.1",
    "mongoose": "^8.6.0",
    "socket.io": "^4.7.5",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.10",
    "tsx": "^4.19.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Create `server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `server/.env.example`**

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/veda
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:3000
```

- [ ] **Step 4: Create `server/.gitignore`**

```gitignore
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: Install dependencies**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npm install`
Expected: `node_modules/` populated, no peer-dep errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/package.json server/package-lock.json server/tsconfig.json server/.env.example server/.gitignore
git commit -m "chore(server): scaffold package + tsconfig"
```

---

## Task 3: Server config — env, db, redis

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/config/env.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/config/db.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/config/redis.ts`

- [ ] **Step 1: Write `src/config/env.ts`**

```typescript
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
```

- [ ] **Step 2: Write `src/config/db.ts`**

```typescript
import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo(): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  console.log("[mongo] connected:", env.MONGODB_URI);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
```

- [ ] **Step 3: Write `src/config/redis.ts`**

BullMQ requires `maxRetriesPerRequest: null` on the connection it uses, and `enableReadyCheck: false` is recommended for workers. Both API and worker import this same module.

```typescript
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
```

- [ ] **Step 4: Quick smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/config/
git commit -m "feat(server): env validation, mongo connect, shared redis connection"
```

---

## Task 4: Shared TS types

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/types/assignment.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/types/questionPaper.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/types/socketEvents.ts`

- [ ] **Step 1: Write `src/types/assignment.ts`**

```typescript
export type AssignmentStatus = "pending" | "processing" | "completed" | "failed";

export interface AssignmentDTO {
  _id: string;
  title: string;
  dueDate?: string; // ISO
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Write `src/types/questionPaper.ts`**

```typescript
export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  text: string;
  difficulty: Difficulty;
  marks: number;
  type: string;
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionPaperDTO {
  _id: string;
  assignmentId: string;
  sections: Section[];
  status: "completed" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Write `src/types/socketEvents.ts`**

```typescript
import type { AssignmentStatus } from "./assignment.js";
import type { QuestionPaperDTO } from "./questionPaper.js";

export interface JobStatusPayload {
  assignmentId: string;
  status: AssignmentStatus;
}

export interface JobProgressPayload {
  assignmentId: string;
  progress: number; // 0-100
  label: string;
}

export interface JobCompletedPayload {
  assignmentId: string;
  paper: QuestionPaperDTO;
}

export interface JobFailedPayload {
  assignmentId: string;
  error: string;
}

// Channel name → payload map (string-typed for ergonomics).
export const SocketEvents = {
  Subscribe: "subscribe",
  JobStatus: "job:status",
  JobProgress: "job:progress",
  JobCompleted: "job:completed",
  JobFailed: "job:failed",
} as const;
```

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/types/
git commit -m "feat(server): shared TS types for assignment, paper, socket events"
```

---

## Task 5: Mongoose models

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/models/Assignment.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/models/QuestionPaper.ts`

- [ ] **Step 1: Write `src/models/Assignment.ts`**

```typescript
import { Schema, model, type InferSchemaType, type Model } from "mongoose";

const AssignmentSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    dueDate: { type: Date },
    questionTypes: { type: [String], required: true, default: [] },
    numQuestions: { type: Number, required: true, min: 1 },
    totalMarks: { type: Number, required: true, min: 1 },
    instructions: { type: String, default: "" },
    sourceText: { type: String },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & { _id: unknown };
export const Assignment: Model<AssignmentDoc> = model<AssignmentDoc>(
  "Assignment",
  AssignmentSchema
);
```

- [ ] **Step 2: Write `src/models/QuestionPaper.ts`**

```typescript
import { Schema, model, type InferSchemaType, type Model, Types } from "mongoose";

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    marks: { type: Number, required: true },
    type: { type: String, required: true },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    instruction: { type: String, default: "" },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
);

const QuestionPaperSchema = new Schema(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    sections: { type: [SectionSchema], default: [] },
    status: { type: String, enum: ["completed", "failed"], required: true },
    error: { type: String },
  },
  { timestamps: true }
);

export type QuestionPaperDoc = InferSchemaType<typeof QuestionPaperSchema> & {
  _id: Types.ObjectId;
};
export const QuestionPaper: Model<QuestionPaperDoc> = model<QuestionPaperDoc>(
  "QuestionPaper",
  QuestionPaperSchema
);
```

- [ ] **Step 3: Smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/models/
git commit -m "feat(server): Assignment + QuestionPaper Mongoose models"
```

---

## Task 6: Zod validation schema for POST /api/assignments

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/validation/assignment.schema.ts`

- [ ] **Step 1: Write the schema**

```typescript
import { z } from "zod";

export const CreateAssignmentSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  dueDate: z.coerce.date().optional(),
  questionTypes: z
    .array(z.string().min(1))
    .min(1, "questionTypes must contain at least one type"),
  numQuestions: z
    .number({ invalid_type_error: "numQuestions must be a number" })
    .int("numQuestions must be an integer")
    .positive("numQuestions must be positive"),
  totalMarks: z
    .number({ invalid_type_error: "totalMarks must be a number" })
    .positive("totalMarks must be positive"),
  instructions: z.string().optional(),
  sourceText: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>;
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/validation/
git commit -m "feat(server): zod validation for create assignment"
```

---

## Task 7: BullMQ queue definition

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/queues/generation.queue.ts`

- [ ] **Step 1: Write the queue module**

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const GENERATION_QUEUE = "generation";

export interface GenerationJobData {
  assignmentId: string;
}

export const generationQueue = new Queue<GenerationJobData>(GENERATION_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,            // Phase 1: no retries — failures should surface fast
    removeOnComplete: 100,  // keep last 100 for visibility
    removeOnFail: 200,
  },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/queues/
git commit -m "feat(server): bullmq generation queue"
```

---

## Task 8: Socket.IO setup + emitter helpers

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/sockets/io.ts`

The Socket.IO `Server` instance lives in this module as a settable singleton. The API process creates it (attached to the HTTP server). For Phase 1, the worker also constructs a separate `Server` on its own HTTP server bound to a different internal port — clients only connect to the API one. To bridge, we'll use a Redis pub/sub bus from worker → API.

**Decision:** Simpler path for Phase 1 — worker runs an in-process Redis publisher; API subscribes and re-emits over its Socket.IO instance. This keeps two processes truly independent while preserving room-scoped delivery.

- [ ] **Step 1: Write `src/sockets/io.ts`**

```typescript
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import IORedis from "ioredis";
import { env } from "../config/env.js";
import {
  SocketEvents,
  type JobCompletedPayload,
  type JobFailedPayload,
  type JobProgressPayload,
  type JobStatusPayload,
} from "../types/socketEvents.js";

const BUS_CHANNEL = "veda:job-events";

// Discriminated union for the cross-process bus.
type BusMessage =
  | { type: "status"; payload: JobStatusPayload }
  | { type: "progress"; payload: JobProgressPayload }
  | { type: "completed"; payload: JobCompletedPayload }
  | { type: "failed"; payload: JobFailedPayload };

let ioInstance: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.on("connection", (socket: Socket) => {
    console.log("[socket] connected:", socket.id);
    socket.on(SocketEvents.Subscribe, (assignmentId: unknown) => {
      if (typeof assignmentId !== "string" || !assignmentId) return;
      socket.join(assignmentId);
      console.log(`[socket] ${socket.id} subscribed to room ${assignmentId}`);
    });
    socket.on("disconnect", () => {
      console.log("[socket] disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
}

// Bridge: API process subscribes to redis and re-emits to the right room.
export function attachBusListener(): void {
  if (!ioInstance) throw new Error("initSocketServer must be called first");
  const sub = new IORedis(env.REDIS_URL);
  sub.subscribe(BUS_CHANNEL, (err) => {
    if (err) console.error("[bus] subscribe error:", err.message);
    else console.log("[bus] subscribed to", BUS_CHANNEL);
  });
  sub.on("message", (_channel, raw) => {
    try {
      const msg = JSON.parse(raw) as BusMessage;
      switch (msg.type) {
        case "status":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobStatus, msg.payload);
          break;
        case "progress":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobProgress, msg.payload);
          break;
        case "completed":
          ioInstance!
            .to(msg.payload.assignmentId)
            .emit(SocketEvents.JobCompleted, msg.payload);
          break;
        case "failed":
          ioInstance!.to(msg.payload.assignmentId).emit(SocketEvents.JobFailed, msg.payload);
          break;
      }
    } catch (err) {
      console.error("[bus] bad message:", err);
    }
  });
}

// Publisher used by the worker process.
export class JobEventPublisher {
  private pub = new IORedis(env.REDIS_URL);

  private publish(msg: BusMessage) {
    return this.pub.publish(BUS_CHANNEL, JSON.stringify(msg));
  }

  status(payload: JobStatusPayload) {
    return this.publish({ type: "status", payload });
  }
  progress(payload: JobProgressPayload) {
    return this.publish({ type: "progress", payload });
  }
  completed(payload: JobCompletedPayload) {
    return this.publish({ type: "completed", payload });
  }
  failed(payload: JobFailedPayload) {
    return this.publish({ type: "failed", payload });
  }
}
```

- [ ] **Step 2: Smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/sockets/
git commit -m "feat(server): socket.io setup + cross-process redis event bus"
```

---

## Task 9: Routes — POST + GET assignments

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/routes/assignments.routes.ts`

- [ ] **Step 1: Write the router**

```typescript
import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { Assignment } from "../models/Assignment.js";
import { QuestionPaper } from "../models/QuestionPaper.js";
import { generationQueue } from "../queues/generation.queue.js";
import { CreateAssignmentSchema } from "../validation/assignment.schema.js";

export const assignmentsRouter = Router();

assignmentsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = CreateAssignmentSchema.parse(req.body);
    const assignment = await Assignment.create({ ...data, status: "pending" });

    await generationQueue.add(
      "generate",
      { assignmentId: assignment._id!.toString() },
      { jobId: assignment._id!.toString() }
    );

    return res.status(201).json({ assignment });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: err.flatten(),
      });
    }
    console.error("[POST /api/assignments] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

assignmentsRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid assignment id" });
  }
  const assignment = await Assignment.findById(id).lean();
  if (!assignment) {
    return res.status(404).json({ error: "Assignment not found" });
  }
  const paper = await QuestionPaper.findOne({ assignmentId: id }).lean();
  return res.json({ assignment, paper: paper ?? null });
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/routes/
git commit -m "feat(server): assignments routes (POST create + enqueue, GET by id)"
```

---

## Task 10: Express + Socket.IO bootstrap (API process)

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/index.ts`

- [ ] **Step 1: Write `src/index.ts`**

```typescript
import http from "node:http";
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { connectMongo } from "./config/db.js";
import { assignmentsRouter } from "./routes/assignments.routes.js";
import { attachBusListener, initSocketServer } from "./sockets/io.ts";

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
```

> **Note:** the import path `./sockets/io.ts` is intentional because `tsx` resolves `.ts` extensions. If running compiled output (`node dist/index.js`), update the import to `./sockets/io.js`. Document this in the README.

**Correction:** Use the `.js` extension everywhere for consistency with the rest of the codebase (Node ESM + `moduleResolution: Bundler` will accept it through tsx and through tsc output). Replace the import line accordingly:

```typescript
import { attachBusListener, initSocketServer } from "./sockets/io.js";
```

- [ ] **Step 2: Smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/index.ts
git commit -m "feat(server): express + socket.io bootstrap (api process)"
```

---

## Task 11: Worker — fake generator + BullMQ worker + entrypoint

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/server/src/workers/fakeGenerate.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/workers/generation.worker.ts`
- Create: `/Users/admin/Desktop/Veda_ai/server/src/worker.ts`

- [ ] **Step 1: Write `src/workers/fakeGenerate.ts`**

```typescript
import type { AssignmentDoc } from "../models/Assignment.js";
import type { Section } from "../types/questionPaper.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fakeGenerate(
  assignment: AssignmentDoc & { _id: unknown }
): Promise<{ sections: Section[] }> {
  // Simulate slow AI work.
  await sleep(3000);

  // Hardcoded, realistic 2-section paper.
  const sections: Section[] = [
    {
      id: "A",
      title: "Section A — Conceptual",
      instruction: "Answer ALL questions. Each question carries the marks indicated.",
      questions: [
        {
          id: "A1",
          text: "Define photosynthesis and write its balanced chemical equation.",
          difficulty: "easy",
          marks: 2,
          type: "short",
        },
        {
          id: "A2",
          text: "Which of the following is NOT a noble gas? (a) Neon (b) Argon (c) Oxygen (d) Krypton",
          difficulty: "easy",
          marks: 1,
          type: "mcq",
        },
        {
          id: "A3",
          text: "Explain how a transformer steps up voltage. Include a labelled diagram.",
          difficulty: "medium",
          marks: 5,
          type: "long",
        },
      ],
    },
    {
      id: "B",
      title: "Section B — Application",
      instruction: "Attempt any TWO of the following three questions.",
      questions: [
        {
          id: "B1",
          text: "A car accelerates uniformly from rest to 20 m/s in 5 s. Find the acceleration and distance covered.",
          difficulty: "medium",
          marks: 4,
          type: "short",
        },
        {
          id: "B2",
          text: "Compare and contrast aerobic and anaerobic respiration with examples.",
          difficulty: "hard",
          marks: 6,
          type: "long",
        },
        {
          id: "B3",
          text: "Newton's third law states that for every action there is an equal and opposite reaction. True or False?",
          difficulty: "easy",
          marks: 1,
          type: "mcq",
        },
      ],
    },
  ];

  // Reference the assignment so future real generation can be parameterised.
  void assignment;
  return { sections };
}
```

- [ ] **Step 2: Write `src/workers/generation.worker.ts`**

```typescript
import { Worker, type Job } from "bullmq";
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
    { connection: redisConnection, concurrency: 2 }
  );

  worker.on("ready", () => console.log("[worker] ready"));
  worker.on("error", (err) => console.error("[worker] error:", err.message));
  return worker;
}
```

- [ ] **Step 3: Write `src/worker.ts`** (standalone process entrypoint)

```typescript
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
```

- [ ] **Step 4: Smoke compile**

Run: `cd /Users/admin/Desktop/Veda_ai/server && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add server/src/workers/ server/src/worker.ts
git commit -m "feat(server): bullmq worker with fake generator + standalone entrypoint"
```

---

## Task 12: Scaffold Next.js client

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/client/package.json`
- Create: `/Users/admin/Desktop/Veda_ai/client/tsconfig.json`
- Create: `/Users/admin/Desktop/Veda_ai/client/next.config.mjs`
- Create: `/Users/admin/Desktop/Veda_ai/client/.env.example`
- Create: `/Users/admin/Desktop/Veda_ai/client/.gitignore`
- Create: `/Users/admin/Desktop/Veda_ai/client/app/layout.tsx`
- Create: `/Users/admin/Desktop/Veda_ai/client/app/globals.css` (empty placeholder so layout can import it without crashing)

- [ ] **Step 1: Make directories**

```bash
mkdir -p /Users/admin/Desktop/Veda_ai/client/app /Users/admin/Desktop/Veda_ai/client/lib /Users/admin/Desktop/Veda_ai/client/types
```

- [ ] **Step 2: Write `client/package.json`**

```json
{
  "name": "veda-client",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4"
  }
}
```

> If `react@19` peer-deps create friction with another package later, fall back to `react@18.3.1` / `next@14.2.x`. Both are fine for this phase.

- [ ] **Step 3: Write `client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `client/next.config.mjs`**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
```

- [ ] **Step 5: Write `client/.env.example`**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

- [ ] **Step 6: Write `client/.gitignore`**

```gitignore
node_modules/
.next/
out/
.env
.env.local
*.log
.DS_Store
next-env.d.ts
```

- [ ] **Step 7: Write `client/app/layout.tsx`**

```tsx
import "./globals.css";

export const metadata = {
  title: "AI Assessment Creator",
  description: "Phase 1 scaffold",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create empty globals.css**

```css
/* phase 1: no styling */
```

- [ ] **Step 9: Install client deps**

Run: `cd /Users/admin/Desktop/Veda_ai/client && npm install`
Expected: no fatal errors (peer-dep warnings ok).

- [ ] **Step 10: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/package.json client/package-lock.json client/tsconfig.json client/next.config.mjs client/.env.example client/.gitignore client/app/layout.tsx client/app/globals.css
git commit -m "chore(client): scaffold next.js app router + socket.io-client"
```

---

## Task 13: Client — types, api, socket helper, live page

**Files:**
- Create: `/Users/admin/Desktop/Veda_ai/client/types/index.ts`
- Create: `/Users/admin/Desktop/Veda_ai/client/lib/api.ts`
- Create: `/Users/admin/Desktop/Veda_ai/client/lib/socket.ts`
- Create: `/Users/admin/Desktop/Veda_ai/client/app/page.tsx`

- [ ] **Step 1: Write `client/types/index.ts`** (mirrors server shared types)

```typescript
export type AssignmentStatus = "pending" | "processing" | "completed" | "failed";

export interface AssignmentDTO {
  _id: string;
  title: string;
  dueDate?: string;
  questionTypes: string[];
  numQuestions: number;
  totalMarks: number;
  instructions?: string;
  sourceText?: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  text: string;
  difficulty: Difficulty;
  marks: number;
  type: string;
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionPaperDTO {
  _id: string;
  assignmentId: string;
  sections: Section[];
  status: "completed" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Write `client/lib/api.ts`**

```typescript
import type { AssignmentDTO } from "../types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface CreateAssignmentBody {
  title: string;
  numQuestions: number;
  totalMarks: number;
  questionTypes: string[];
  instructions?: string;
  dueDate?: string;
}

export async function createAssignment(
  body: CreateAssignmentBody
): Promise<{ ok: true; assignment: AssignmentDTO } | { ok: false; error: string; details?: unknown }> {
  const res = await fetch(`${API}/api/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Request failed", details: data.details };
  }
  return { ok: true, assignment: data.assignment };
}
```

- [ ] **Step 3: Write `client/lib/socket.ts`**

```typescript
import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"], autoConnect: true });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

- [ ] **Step 4: Write `client/app/page.tsx`** (full form + live view)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createAssignment } from "../lib/api";
import { getSocket } from "../lib/socket";
import type {
  AssignmentStatus,
  QuestionPaperDTO,
} from "../types";

const QUESTION_TYPES = ["mcq", "short", "long"] as const;

export default function HomePage() {
  const [title, setTitle] = useState("Sample Assessment");
  const [numQuestions, setNumQuestions] = useState(6);
  const [totalMarks, setTotalMarks] = useState(20);
  const [types, setTypes] = useState<string[]>(["mcq", "short"]);

  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [status, setStatus] = useState<AssignmentStatus | "idle">("idle");
  const [progress, setProgress] = useState<{ pct: number; label: string }>({
    pct: 0,
    label: "",
  });
  const [paper, setPaper] = useState<QuestionPaperDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscribedId = useRef<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    const socket = getSocket();

    const subscribe = () => {
      socket.emit("subscribe", assignmentId);
      subscribedId.current = assignmentId;
    };

    if (socket.connected) subscribe();
    socket.on("connect", subscribe);

    socket.on("job:status", (p: { assignmentId: string; status: AssignmentStatus }) => {
      if (p.assignmentId === assignmentId) setStatus(p.status);
    });
    socket.on(
      "job:progress",
      (p: { assignmentId: string; progress: number; label: string }) => {
        if (p.assignmentId === assignmentId) setProgress({ pct: p.progress, label: p.label });
      }
    );
    socket.on("job:completed", (p: { assignmentId: string; paper: QuestionPaperDTO }) => {
      if (p.assignmentId === assignmentId) {
        setPaper(p.paper);
        setStatus("completed");
      }
    });
    socket.on("job:failed", (p: { assignmentId: string; error: string }) => {
      if (p.assignmentId === assignmentId) {
        setError(p.error);
        setStatus("failed");
      }
    });

    return () => {
      socket.off("connect", subscribe);
      socket.off("job:status");
      socket.off("job:progress");
      socket.off("job:completed");
      socket.off("job:failed");
    };
  }, [assignmentId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPaper(null);
    setStatus("idle");
    setProgress({ pct: 0, label: "" });
    setAssignmentId(null);

    const res = await createAssignment({
      title,
      numQuestions,
      totalMarks,
      questionTypes: types,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAssignmentId(res.assignment._id);
    setStatus(res.assignment.status);
  }

  function toggleType(t: string) {
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>AI Assessment Creator — Phase 1</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          # Questions
          <input
            type="number"
            min={1}
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            required
          />
        </label>
        <label>
          Total Marks
          <input
            type="number"
            min={1}
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            required
          />
        </label>
        <fieldset>
          <legend>Question Types</legend>
          {QUESTION_TYPES.map((t) => (
            <label key={t} style={{ marginRight: 12 }}>
              <input
                type="checkbox"
                checked={types.includes(t)}
                onChange={() => toggleType(t)}
              />
              {t}
            </label>
          ))}
        </fieldset>
        <button type="submit">Generate</button>
      </form>

      {error && (
        <div style={{ color: "crimson", marginBottom: 16 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {assignmentId && (
        <section>
          <p>
            <strong>Assignment ID:</strong> {assignmentId}
          </p>
          <p>
            <strong>Status:</strong> {status}
          </p>
          {status === "processing" && (
            <div>
              <div
                style={{
                  background: "#eee",
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                  width: 400,
                }}
              >
                <div
                  style={{
                    background: "#4caf50",
                    width: `${progress.pct}%`,
                    height: "100%",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
              <small>
                {progress.pct}% — {progress.label}
              </small>
            </div>
          )}
        </section>
      )}

      {paper && (
        <section style={{ marginTop: 24 }}>
          <h2>Generated Paper (raw JSON)</h2>
          <pre
            style={{
              background: "#f6f8fa",
              padding: 12,
              borderRadius: 6,
              overflow: "auto",
            }}
          >
            {JSON.stringify(paper, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add client/types/ client/lib/ client/app/page.tsx
git commit -m "feat(client): live form + socket-driven status/progress/paper view"
```

---

## Task 14: README — how to run everything

**Files:**
- Modify: `/Users/admin/Desktop/Veda_ai/README.md`

- [ ] **Step 1: Replace README contents**

```markdown
# AI Assessment Creator

A teacher-facing tool that generates exam question papers. **Phase 1** stands up the end-to-end real-time job pipeline with a *fake* (hardcoded) generator. Phase 2 will replace the fake generator with a real LLM call.

## Architecture (Phase 1)

```
Client (Next.js)  ──POST /api/assignments──▶  API (Express)
        ▲                                         │
        │                                    enqueue job
        │                                         ▼
   Socket.IO ◀─── Redis pub/sub ◀── Worker (BullMQ)
        ▲                                         │
        │                                  fakeGenerate (3s sleep)
        │                                         ▼
        └─── status / progress / paper ─── MongoDB (Assignment + QuestionPaper)
```

The API and the worker run as **separate processes** sharing a Redis connection. The worker publishes job events to a Redis channel; the API re-emits them to the right Socket.IO room (`assignmentId`).

## Prereqs

- Node 20+
- Docker + Docker Compose

## Run it

Open three terminals.

### 1. Infra

```bash
docker compose up
```

This starts MongoDB (`localhost:27017`) and Redis (`localhost:6379`).

### 2. API + worker (in `server/`)

```bash
cd server
cp .env.example .env
npm install
# terminal A
npm run dev
# terminal B
npm run worker
```

### 3. Client (in `client/`)

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

## What to expect

1. Submit the form.
2. The page shows `pending` → `processing`.
3. Progress bar walks through 10/40/70/100 with labels (`Building prompt`, `Generating Section A`, `Validating`, `Done`).
4. The completed paper renders below as JSON.

Invalid input (e.g. empty title, zero questions) returns a `400` and shows the error on the page.

## Env vars

`server/.env`:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/veda
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:3000
```

`client/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Known Phase 1 limitations (intentional)

- Generator is hardcoded; no AI integration.
- Single API process, single worker process. Horizontal scale needs the Socket.IO Redis adapter (Phase 2).
- Client UI is intentionally bare — Phase 3 builds the real UI.
- No auth.
```

- [ ] **Step 2: Commit**

```bash
cd /Users/admin/Desktop/Veda_ai
git add README.md
git commit -m "docs: README with architecture diagram and run instructions"
```

---

## Task 15: End-to-end acceptance verification

This is the spec's acceptance checklist. Run it before declaring the phase done.

- [ ] **AC1 — Infra starts**

Run: `docker compose -f /Users/admin/Desktop/Veda_ai/docker-compose.yml up -d`
Then: `docker compose -f /Users/admin/Desktop/Veda_ai/docker-compose.yml ps`
Expected: both `veda-mongo` and `veda-redis` show status `running`.

- [ ] **AC2 — API and worker start and connect**

In server/, run `npm run dev` in one terminal and `npm run worker` in another.
Expected logs:
- API: `[mongo] connected: ...`, `[redis] connected: ...`, `[bus] subscribed to veda:job-events`, `[api] listening on http://localhost:4000`
- Worker: `[mongo] connected: ...`, `[worker] ready`, `[worker] started`

- [ ] **AC3 — Happy path via curl**

```bash
curl -sS -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","numQuestions":6,"totalMarks":20,"questionTypes":["mcq","short"]}'
```

Expected: `201` with `{ "assignment": { "_id": "...", "status": "pending", ... } }`.

Within ~4 seconds, follow up with:

```bash
curl -sS http://localhost:4000/api/assignments/<assignmentId>
```

Expected: `assignment.status === "completed"` and `paper.sections.length === 2`.

- [ ] **AC4 — Browser real-time loop**

Start `client` (`npm run dev`), open http://localhost:3000, submit the form.
Expected (no refresh):
- Status flips `pending` → `processing` → `completed`.
- Progress bar walks 10 → 40 → 70 → 100 with labels.
- Generated paper JSON renders.

- [ ] **AC5 — Validation**

```bash
curl -sS -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{"title":"","numQuestions":0,"totalMarks":0,"questionTypes":[]}' \
  -w "\nHTTP %{http_code}\n"
```

Expected: `HTTP 400` and JSON `{ "error": "Validation failed", "details": { "fieldErrors": { ... } } }` with messages for `title`, `numQuestions`, `totalMarks`, `questionTypes`.

- [ ] **AC6 — Failure path**

Temporarily edit `server/src/workers/fakeGenerate.ts` to `throw new Error("forced failure")` before the `await sleep`. Restart the worker. Submit the form again.

Expected:
- Client status flips to `failed`.
- Error message shows in the UI.
- `Assignment.status === "failed"` and a `QuestionPaper` doc with `status: "failed"` and the error message is in Mongo.

Revert the edit and restart the worker afterwards.

- [ ] **AC7 — Persistence check**

In a mongo shell (`docker exec -it veda-mongo mongosh veda`):

```javascript
db.assignments.find().pretty()
db.questionpapers.find().pretty()
```

Expected: documents from your test runs are present.

- [ ] **Step 1: Final commit (if any small fixups were needed)**

```bash
cd /Users/admin/Desktop/Veda_ai
git status
# stage any small fixups, then:
git commit -m "fix: acceptance check fixups" # only if needed
```

---

## Self-Review Notes

- **Spec coverage:**
  - Repo structure → Tasks 2, 5, 7–11, 12–13.
  - Mongoose models exactly as specified → Task 5 (timestamps + enum + ref ok).
  - Pipeline POST/queue/worker/Socket.IO/GET → Tasks 7–11.
  - Validation rules + error shape → Tasks 6, 9, AC5.
  - Minimal client → Tasks 12–13.
  - docker-compose → Task 1.
  - Env + CORS + single Redis connection + `maxRetriesPerRequest: null` → Tasks 3, 7, 10.
  - Scripts (dev/worker/build/start) → Task 2.
  - Separate API + worker processes → Tasks 10, 11.
  - Acceptance criteria → Task 15.
  - Commit in logical chunks → built into every task.

- **Naming consistency:** queue name `"generation"` (Tasks 7, 11) ✓. Channel `"veda:job-events"` is private to `sockets/io.ts` (Task 8) ✓. Socket event names from `SocketEvents` (Task 4) used in Tasks 8 + 13 ✓. Method names on `JobEventPublisher` (`status`/`progress`/`completed`/`failed`) used consistently in Task 11 ✓.

- **Known trade-offs:**
  - Worker writes to Redis pub/sub instead of directly to Socket.IO — keeps processes truly independent at the cost of one extra hop. Phase 2 should switch to the Socket.IO Redis adapter.
  - No unit tests this phase; Task 15 is full end-to-end verification per the spec's acceptance criteria. If unit tests are wanted, add a separate task before Task 15.
