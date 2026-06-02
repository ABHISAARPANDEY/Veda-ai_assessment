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

The API and the worker run as **separate processes** sharing Redis. The worker publishes job events to a Redis pub/sub channel; the API subscribes and re-emits them to the right Socket.IO room (`assignmentId`).

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
npm install --legacy-peer-deps
npm run dev
```

> `--legacy-peer-deps` is needed because Next 15 + React 19 don't yet ship matching `@types/react@19`.

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

## Repo layout

```
/docker-compose.yml          mongo + redis
/server                      Express API + BullMQ worker (two entrypoints)
  src/config/                env, mongo, shared ioredis
  src/models/                Assignment, QuestionPaper
  src/queues/                BullMQ generation queue
  src/workers/               fakeGenerate + Worker handler
  src/routes/                POST + GET /api/assignments
  src/sockets/               Socket.IO server + cross-process redis bus
  src/types/                 shared TS types
  src/validation/            Zod schema for POST body
  src/index.ts               API process entry
  src/worker.ts              Worker process entry
/client                      Next.js (App Router)
  app/page.tsx               form + live socket view
  lib/api.ts, lib/socket.ts  helpers
  types/index.ts             mirrored DTO types
```

## Known Phase 1 limitations (intentional)

- Generator is hardcoded; no AI integration.
- Single API process, single worker process. Horizontal scale needs the Socket.IO Redis adapter (Phase 2).
- Client UI is intentionally bare — Phase 3 builds the real UI.
- No auth.
- `next@15.0.3` pinned for scaffolding; Phase 2 should bump to the latest patched 15.x to pick up middleware CVE fixes.
