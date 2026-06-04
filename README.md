# VedaAI — AI Assessment Creator

> **Full-stack AI-powered question paper generator.** A teacher signs in, fills in a form (or uploads source material), and the system generates a structured, validated question paper using OpenAI — with real-time progress, room-scoped Socket.IO updates, Redis-backed caching, a separate worker process, and a PDF download.

Built against the [VedaAI hiring assignment brief](#assignment-brief-fit). All core requirements + most bonuses + several extras (auth, settings, profile picture, regenerate, real PDF upload, real PDF download) are implemented end-to-end.

---

## Live demo & screenshots

- **Live URL:** _(add after Render + Vercel deploy)_
- **Screenshots** of every screen live in [`client/design-reference/`](./client/design-reference/) — built pixel-close to the supplied Figma.

---

## Architecture

```
+------------------------------------------------------------------------------+
|                                                                              |
|  +----------------+  POST /api/assignments  +----------------+               |
|  | Next.js client | ----------------------> | Express API    |               |
|  | (Vercel)       |                         | (Render Web)   |               |
|  |                | <-- 201 (pending) -----  |                |               |
|  +--------+-------+                         +--------+-------+               |
|           |                                          |                       |
|           |     Socket.IO room=<assignmentId>   +----v----------+            |
|           | <---------------------------------------- Redis pub/sub |            |
|           |                                     |  BullMQ queue |            |
|           |                                     +----^----------+            |
|           |                                          |                       |
|           |                                  +-------+--------+              |
|           |                                  | Worker process |              |
|           |                                  | (Render Worker)|              |
|           |                                  |                |              |
|           |                                  | 1. cache check |              |
|           |                                  | 2. OpenAI call |              |
|           |                                  | 3. Zod validate|              |
|           |                                  | 4. retry once  |              |
|           |                                  | 5. save + emit |              |
|           |                                  +----+-----------+              |
|           |                                       |                          |
|           |                              +--------v---------+                |
|           |                              | MongoDB Atlas    |                |
|           |                              | (Users +         |                |
|           |                              |  Assignments +   |                |
|           |                              |  QuestionPapers) |                |
|           |                              +------------------+                |
|           v                                                                  |
|  GET /api/assignments/:id   (fallback if a socket event is missed)           |
|                                                                              |
+------------------------------------------------------------------------------+
```

**The API and Worker run as separate processes** sharing Redis. The worker publishes job events on a Redis pub/sub channel (`veda:job-events`); the API re-emits them to the right Socket.IO room (`assignmentId`). This mirrors a real production deployment — API can scale horizontally, worker can scale on its own.

### Tech stack

| Layer | Stack |
|---|---|
| Client | Next.js 15 (App Router) · TypeScript · Tailwind · Zustand · NextAuth v5 · Socket.IO client · @react-pdf/renderer |
| API | Node 20 · Express 4 · TypeScript · Mongoose 8 · Socket.IO 4 · BullMQ 5 · Zod · bcryptjs · jsonwebtoken · multer · pdf-parse |
| Worker | Standalone Node entrypoint · BullMQ Worker · OpenAI SDK |
| Infra (local) | docker-compose (Mongo + Redis) |
| Infra (prod) | Vercel (client) · Render (API + Worker + Redis) · MongoDB Atlas |

---

## Features

### Required by the brief

- **Assignment Creation form** with file upload, due date, question types (multi-row with steppers), additional instructions
- **Client + server validation** — Zustand `validate()` matches server-side Zod 400s
- **Zustand state** (`useAssignmentStore`)
- **WebSocket management** — Socket.IO, room-scoped to `assignmentId`
- **AI question generation** — structured prompt → `response_format: json_object` → JSON.parse in try/catch → Zod validate → semantic checks (marks sum, question count)
- **Never raw AI output stored or rendered** — only the validated `GeneratedPaper` typed object flows downstream
- **Backend stack: Node + Express + TS, MongoDB, Redis, BullMQ, WebSocket**
- **Flow: API → queue → worker → store → notify** — proven end-to-end with live tests
- **Output page**: student info inputs, sections w/ title + instruction, questions w/ text + difficulty tag + marks, mobile responsive

### Bonus features from the brief

- **Download as PDF** — real PDF via `@react-pdf/renderer` with answer key
- **Regenerate** — action button on the output page re-runs generation with the same inputs
- **Difficulty as visual tags** — color-tinted bracketed difficulty (`[Easy]`/`[Moderate]`/`[Challenging]`) inside the paper, matching the Figma's printed-paper look
- **Better caching** — sha256 of normalized inputs → Redis cache with 24h TTL → cache hits skip OpenAI entirely and show "Loaded from cache"

### Extras beyond the brief

- **Authentication** — JWT-backed signup / sign-in via NextAuth credentials provider → backend `/api/auth` routes
- **Settings page** — profile picture upload, editable name + school, read-only email
- **Per-user scoping** — assignments are private to their owner (`userId` field; `attachAuth`/`requireAuth` middleware)
- **Real PDF / text upload** — `multer` + `pdf-parse` extract text on the server into `sourceText`, which biases the AI prompt
- **Retry-on-invalid-AI-output** — if the model returns malformed JSON or violates the schema, the next call re-prompts with the validation error injected
- **Cross-process event bus** — Redis pub/sub bridges the standalone Worker to the API's Socket.IO rooms

---

## Local setup

### Prereqs
- Node.js 20+
- Docker Desktop (or any container runtime that supports docker-compose)
- An OpenAI API key

### One-time

```bash
# clone
git clone https://github.com/<you>/vedaai.git
cd vedaai

# copy env templates and fill in the OpenAI key
cp server/.env.example server/.env
cp client/.env.example client/.env.local
# edit server/.env and set OPENAI_API_KEY=sk-...

# install
(cd server && npm install)
(cd client && npm install --legacy-peer-deps)
```

### Run

Open four terminals.

| Terminal | Working dir | Command | What |
|---|---|---|---|
| 1 | `vedaai/` | `docker compose up` | Mongo + Redis |
| 2 | `vedaai/server/` | `npm run dev` | Express API on :4000 |
| 3 | `vedaai/server/` | `npm run worker` | BullMQ worker (separate process) |
| 4 | `vedaai/client/` | `npm run dev` | Next.js on :3000 |

Visit **http://localhost:3000** — sign up, fill the form, watch real-time progress, see the generated paper.

### Troubleshooting

- **"Stuck on pending"** — the worker isn't running. Start terminal 3.
- **`ECONNREFUSED :6379` or `:27017`** — docker compose isn't up. Start terminal 1.
- **`JWT_SECRET must be at least 32 chars`** — set it in `server/.env`.

---

## Deployment

### Backend — Render (Blueprint)

The repo includes a Render Blueprint (`render.yaml`) that provisions:
- **vedaai-api** (Docker web service)
- **vedaai-worker** (Docker background worker)
- **vedaai-redis** (managed Redis instance, free tier)

Steps:
1. Sign up at [render.com](https://render.com)
2. Create a free MongoDB Atlas cluster, copy the connection string
3. New → Blueprint → connect your fork → pick `render.yaml`
4. When prompted, fill the secrets: `MONGODB_URI`, `OPENAI_API_KEY`, `CLIENT_ORIGIN` (your Vercel URL)
5. Deploy. Render auto-builds the Docker image from `server/Dockerfile` and runs API + Worker as separate services sharing the same image.

### Client — Vercel

```bash
cd client
npx vercel
```

Set env vars in Vercel dashboard:

| Var | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://vedaai-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://vedaai-api.onrender.com` |
| `NEXTAUTH_URL` | `https://your-vedaai.vercel.app` |
| `NEXTAUTH_SECRET` | _(generate a 32+ char random string)_ |

Then back in Render, update `CLIENT_ORIGIN` to the Vercel URL so CORS lets it through.

---

## Environment variables

### `server/.env`

| Var | Default | Required in prod |
|---|---|---|
| `PORT` | `4000` | No (Render sets this) |
| `MONGODB_URI` | `mongodb://localhost:27017/veda` | Yes |
| `REDIS_URL` | `redis://localhost:6379` | Yes (auto-set by Blueprint) |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Yes (CORS) |
| `OPENAI_API_KEY` | _(empty)_ | Yes |
| `OPENAI_MODEL` | `gpt-4o-mini` | No |
| `JWT_SECRET` | _(must be 32+ chars)_ | Yes |
| `JWT_EXPIRES_IN` | `7d` | No |

### `client/.env.local`

| Var | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:4000` |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | _(must be 32+ chars)_ |

---

## The AI generation pipeline (the "do not render raw AI" rule)

1. Client POSTs to `/api/assignments` (with Bearer token) → API validates body with Zod, creates Assignment doc (status `pending`), enqueues a BullMQ job, returns `201` in ~5ms.
2. Worker picks up the job. Computes a sha256 cache key over normalized inputs. Checks Redis.
   - **Cache hit:** emits "Loaded from cache" label, persists a fresh QuestionPaper doc, emits `job:completed`.
   - **Cache miss:** calls OpenAI `gpt-4o-mini` with `response_format: { type: "json_object" }`.
3. Response is `JSON.parse`d inside a try/catch.
4. Parsed value is run through `PaperSchema.safeParse` (Zod). Schema enforces:
   - 1+ sections, each with 1+ questions
   - non-empty question text
   - difficulty in {easy, medium, hard}
   - positive marks
   - `answer` string per question
5. A semantic check verifies marks sum == requested totalMarks and question count == requested numQuestions.
6. If parse OR validation fails, **retry once** with the previous failure reason fed back as a correction prompt.
7. Only the validated `GeneratedPaper` object is stored in MongoDB and emitted to the client.
8. The worker writes to a Redis pub/sub channel; the API listens and re-emits to the Socket.IO room.

---

## Auth model

- JWT-based, signed by the backend with `JWT_SECRET`
- `POST /api/auth/signup` + `POST /api/auth/login` return `{ token, user }`
- `GET /api/auth/me` returns current user (protected)
- `PATCH /api/user/me` + `POST /api/user/me/avatar` for settings
- NextAuth v5 on the client uses a **Credentials provider** that calls the backend's login route; the backend JWT is stashed inside the NextAuth session JWT and sent as `Authorization: Bearer <token>` on protected fetches.

---

## Repo layout

```
/docker-compose.yml          mongo + redis for local dev
/render.yaml                 Render blueprint (API + worker + redis)
/server                      Express API + BullMQ worker (two entrypoints)
  Dockerfile
  src/config/                env, mongo, redis, openai client
  src/models/                User, Assignment, QuestionPaper
  src/queues/                BullMQ generation queue
  src/workers/               generatePaper (cache + retry), paperSchema, promptBuilder, paperCache
  src/routes/                auth, assignments, user
  src/middleware/            requireAuth / attachAuth
  src/sockets/               Socket.IO + redis bus
  src/lib/                   jwt, upload (multer), extractText (pdf-parse)
  src/index.ts               API process entry
  src/worker.ts              Worker process entry
/client                      Next.js App Router
  app/(app)/                 protected routes (sidebar+topbar layout)
    assignments/             list, [id] (paper output), new (form)
    settings/                profile + avatar
  app/auth/                  sign-in, sign-up
  components/                layout/, ui/, pdf/, icons/, providers/
  store/                     Zustand
  lib/                       api, socket, authClient, cn, persona
/docs/superpowers/plans/     phase-by-phase build plans (1-4)
```

---

## Phase history

Built in four phases, each with its own plan in `docs/superpowers/plans/`:

1. **Phase 1** — Foundation & real-time pipeline (Express + BullMQ + Socket.IO + Mongo + Redis with a fake generator)
2. **Phase 2** — Real OpenAI generation (strict JSON, Zod, retry, Redis cache)
3. **Phase 3** — Pixel-perfect frontend (Tailwind from Figma tokens, sidebar/topbar, full UI)
4. **Phase 4** — Full SaaS layer (auth, settings, profile pic, PDF download, regenerate, real file upload, deployment configs)

---

## Assignment brief fit

Every line item from the VedaAI brief is implemented:

| Brief requirement | Where |
|---|---|
| Assignment Creation form: file/due date/types/N/marks/instructions | `client/app/(app)/assignments/new/page.tsx` |
| Validation (no empty/negative) | `client/store/useAssignmentStore.ts` + `server/src/validation/assignment.schema.ts` |
| Redux/Zustand | `client/store/useAssignmentStore.ts` |
| WebSocket | `client/lib/socket.ts` + `server/src/sockets/io.ts` |
| AI generation: structured prompt, sections/questions/difficulty/marks, no raw render | `server/src/workers/{promptBuilder,paperSchema,generatePaper}.ts` |
| Backend: Node+Express+TS, MongoDB, Redis, BullMQ, WebSocket | `server/` |
| Flow: API to queue to worker to store to notify | end-to-end verified |
| Output page: student info, sections w/ title + instruction, questions w/ text + difficulty + marks, mobile responsive | `client/app/(app)/assignments/[id]/page.tsx` |
| Bonus: Download as PDF | `client/components/pdf/` |
| Bonus: Regenerate | `client/components/ui/RegenerateButton.tsx` |
| Bonus: Difficulty as visual tag | `client/components/ui/DifficultyText.tsx` |
| Bonus: Better caching | `server/src/workers/paperCache.ts` |

---

## Decisions made

| Decision | Reason |
|---|---|
| Separate worker process (not in-process) | Matches the brief's explicit "separate worker" requirement; allows independent scaling on Render |
| Redis pub/sub for cross-process events | Lets the API own Socket.IO while the worker stays stateless; clean seam for horizontal scale |
| `response_format: json_object` + Zod parse + semantic check | Belt-and-suspenders against hallucinated structure; retry loop recovers from first-attempt failures without blowing budget |
| NextAuth credentials provider (not OAuth) | Self-contained — no external OAuth app registration needed; reviewer can sign up immediately with any email |
| `@react-pdf/renderer` client-side PDF | Zero server infrastructure for PDF; runs in the browser, works on Vercel static edge |
| `gpt-4o-mini` as default model | Cost-effective for structured generation; configurable via `OPENAI_MODEL` env var |
| Free-tier Render + Atlas for prod | Zero cost for a hiring demo; `render.yaml` Blueprint makes it one-click repeatable |
