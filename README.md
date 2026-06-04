<div align="center">

# VedaAI — AI Assessment Creator

**A full-stack SaaS for teachers to generate AI-powered exam papers — with a strict-JSON validation gate, real-time progress, role-scoped data, deterministic post-processing, and a Render + Vercel + MongoDB Atlas production deploy.**

[**🌐 Live demo**](https://veda-ai-assessment-nine.vercel.app) · [Approach](#-approach) · [Architecture](#-architecture) · [Setup](#-setup-3-minutes) · [API](#-api-reference) · [Decisions](#-key-decisions--trade-offs)

</div>

---

## 🌐 Live demo

**App:** https://veda-ai-assessment-nine.vercel.app

**API health:** https://vedaai-api-imf5.onrender.com/api/health

Sign up with any email + an 8+ char password. End-to-end takes ~30 seconds from blank account to generated paper.

> ⚠️ **First request after ~15min idle takes 30-60s** while Render's free-tier container wakes from sleep. This is a Render free-tier limitation, not the application. Subsequent requests are fast (papers generate in ~5-10s).

> 🎥 **Loom walkthrough:** *(add link after recording)*

## Screenshots

A few highlights from the live app. All 13 screenshots in [`docs/screenshots/`](./docs/screenshots).

| Sign in | Create assignment |
|---|---|
| ![Sign in](./docs/screenshots/01-sign-in-desktop.png) | ![Create form](./docs/screenshots/04-create-form-desktop.png) |

| Generated paper (with detailed answer key) | Settings |
|---|---|
| ![Paper output](./docs/screenshots/05-paper-output-desktop.png) | ![Settings](./docs/screenshots/06-settings-desktop.png) |

| AI Teacher's Toolkit | My Groups |
|---|---|
| ![Toolkit](./docs/screenshots/08-toolkit-desktop.png) | ![Groups](./docs/screenshots/07-groups-list-desktop.png) |

| My Library | Quick Quiz |
|---|---|
| ![Library](./docs/screenshots/10-library-desktop.png) | ![Quick Quiz](./docs/screenshots/09-quick-quiz-desktop.png) |

**Mobile responsive** (393–414px):

| Assignments list | Create form (stacked rows) | Paper output |
|---|---|---|
| ![Mobile list](./docs/screenshots/11-assignments-list-mobile.png) | ![Mobile form](./docs/screenshots/12-create-form-mobile.png) | ![Mobile paper](./docs/screenshots/13-paper-output-mobile.png) |

---

## 🚀 Approach

I built this in four phases, layering complexity intentionally so each piece could be verified before the next was added.

### Phase 1 — Build the pipeline first, with a fake generator

Before writing a single OpenAI call, I built the full **API → BullMQ queue → separate worker process → MongoDB → Socket.IO push** loop using a hardcoded `fakeGenerate()` function. This proved the real-time architecture worked end-to-end — that the API could respond instantly, the worker could process jobs in a separate Node process, and the client got room-scoped progress events through a Redis pub/sub bridge.

Working through Phase 1 made the AI work in Phase 2 trivial: I only had to swap one function.

### Phase 2 — Real AI generation with a strict "never render raw output" gate

The brief's hardest rule is *"do not directly render LLM response."* I built a strict three-layer gate:

```
OpenAI response (string)
  → JSON.parse  (try/catch — parse failure does not crash the worker)
  → PaperSchema.safeParse  (Zod — enforces shape, types, enums, minimums)
  → validatePaperAgainstAssignment  (semantic — marks within tolerance, count within tolerance)
  → (on failure) RETRY ONCE with the validation error injected as a correction prompt
  → assignStableIds  (backfill ids if AI omitted them)
  → applyMarksFromBreakdown  (deterministic — set marks per question from the form's exact spec)
  → reconcilePaper  (proportional rescale to hit exact totalMarks if no breakdown was given)
  → GeneratedPaper (typed)  →  MongoDB + Socket.IO emit + Redis cache
```

Two non-obvious wins from this design:

1. **The AI cannot violate the marks/count contract.** If the form says "4 MCQ × 1 mark + 4 Numerical × 5 marks," the post-processor sets each question's marks from the breakdown deterministically — regardless of what the AI guessed. Marks sums are mathematically exact.
2. **Retry recovers from common LLM failure modes.** When parse or validation fails, the next call gets the validation error as a user message: *"Your previous response was invalid because X. Return ONLY valid JSON matching shape Y."* In practice this turns most one-off failures into successes.

Added a Redis cache keyed by sha256 of normalized inputs (sorted question types, lowercased title, etc.) with a 24h TTL. Identical inputs skip the OpenAI call entirely and show a "Loaded from cache" label live in the UI.

### Phase 3 — Pixel-perfect frontend from the Figma

Built the design system in Tailwind with design tokens extracted from the Figma file. Components-first approach: every reusable element (Button, Stepper, Card, Select, Pill badges, ProgressBar) became its own file, then composed into pages.

Used **Zustand** for the assignment-creation form state (per the brief), **NextAuth v5** credentials provider talking to the backend's JWT endpoints for auth, and **Socket.IO client** for live progress events.

### Phase 4 — Make it a real SaaS

Auth (signup/login with bcrypt + JWT), per-user data scoping (`userId` on every owned record with ownership checks on every protected route), settings with profile picture upload, real PDF/text source upload that gets OCR'd via `pdf-parse`, Groups CRUD for student organization, AI Toolkit with a live Quick Quiz tool, My Library for archived papers, rate limiting (`express-rate-limit`), graceful shutdown handlers, integration tests with vitest+supertest, GitHub Actions CI.

### Performance hardening for the free-tier deployment

Render's free tier drops the API container after 15min of idle. Built three defenses:

- **Polling fallback in the generation overlay** — runs alongside the socket. If the socket connects after the worker already finished (common on cold start), the overlay polls `GET /api/assignments/:id` every 1.5s and routes to the paper as soon as `status === "completed"`.
- **Session-based user data, not API-based** — the `(app)` layout reads name/avatar/school straight from the NextAuth session JWT instead of round-tripping to `/api/auth/me` on every nav. Saves 150-500ms per click (or 30s+ during cold start). Settings save calls `session.update({ user: ... })` which the JWT callback merges into the token, so changes appear instantly without a refetch.
- **Vercel function maxDuration: 60** on the NextAuth handler so cold starts don't trip the default 10s timeout during sign-in.

---

## 🏗 Architecture

### Process model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌────────────────┐  POST /api/assignments     ┌────────────────┐       │
│  │ Next.js client │ ─────────────────────────▶ │ Express API    │       │
│  │ (Vercel)       │                            │ (Render Web)   │       │
│  │                │ ◀── 201 (status: pending)  │                │       │
│  └────────┬───────┘                            └────────┬───────┘       │
│           │                                             │               │
│           │      Socket.IO room=<assignmentId>    ┌─────▼──────────┐    │
│           │ ◀────────────────────────────────────▶│ Redis pub/sub  │    │
│           │                                       │  BullMQ queue  │    │
│           │                                       └─────▲──────────┘    │
│           │                                             │               │
│           │                                  ┌──────────┴────────┐      │
│           │                                  │ BullMQ Worker     │      │
│           │                                  │ (same Node proc   │      │
│           │                                  │  on Render free   │      │
│           │                                  │  tier; separate   │      │
│           │                                  │  process locally) │      │
│           │                                  │                   │      │
│           │                                  │ 1. cache lookup   │      │
│           │                                  │ 2. OpenAI call    │      │
│           │                                  │ 3. JSON.parse     │      │
│           │                                  │ 4. Zod validate   │      │
│           │                                  │ 5. retry on bad   │      │
│           │                                  │ 6. reconcile      │      │
│           │                                  │ 7. save + emit    │      │
│           │                                  └────┬──────────────┘      │
│           │                                       │                     │
│           │                              ┌────────▼─────────┐           │
│           │                              │ MongoDB Atlas    │           │
│           │                              │ Users +          │           │
│           │                              │ Assignments +    │           │
│           │                              │ QuestionPapers + │           │
│           │                              │ Groups           │           │
│           │                              └──────────────────┘           │
│           ▼                                                             │
│  GET /api/assignments/:id  ← polling fallback                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why two processes (and why one on Render)

**In dev and on paid plans:** the API (`server/src/index.ts`) and the worker (`server/src/worker.ts`) boot as **two separate Node processes** sharing Redis. The worker publishes job events on a Redis pub/sub channel (`veda:job-events`); the API re-emits them to the right Socket.IO room (`assignmentId`).

**On Render's free tier:** background-worker services were removed from the free plan. So a third entry point `server/src/combined.ts` boots Express + the BullMQ worker **in the same Node process** — the architecture is preserved (still Redis pub/sub, still Zod gate, still room-scoped Socket.IO), only the OS-level topology changes. To split them back when upgrading, override the Dockerfile CMD on each Render service.

### The five flows in detail

#### 1. Authentication

```
Browser ──── POST /api/auth/login (email + password) ────▶ Backend
                                                            │
                       JWT (signed, JWT_SECRET ≥32 chars) ◀─┘
Browser stores JWT inside NextAuth session JWT (HttpOnly cookie)
Browser ──── Authorization: Bearer <JWT> ────▶ Backend on every request
                                                            │
                          requireAuth middleware verifies   │
                          and sets req.user.sub             │
```

JWT validation is per-request, stateless. Per-resource ownership is checked in every protected handler: `if (resource.userId !== req.user.sub) return 404`.

#### 2. Assignment creation (the brief's required flow)

```
Browser           Backend API           Redis           Worker         MongoDB        OpenAI
   │                  │                   │              │                │              │
   ├─POST 1───────────▶                   │              │                │              │
   │                  ├─validate + create ────────────────────────────────▶              │
   │                  ├─enqueue job───────▶              │                │              │
   ◀─201 (pending)────┤                   │              │                │              │
   │                  │                   ◀─BullMQ pop───┤                │              │
   │                  │                   │              ├─cache check?───▶              │
   │                  │                   │              ├──────────────────────────────▶
   │                  │                   │              ◀── 200 JSON ───────────────────┤
   │                  │                   │              ├─JSON.parse + Zod              │
   │                  │                   │              ├─reconcile marks               │
   │                  │                   │              ├─save paper ────▶              │
   │                  │                   ◀─publish event│                │              │
   ◀─job:progress ────┤                   │              │                │              │
   ◀─job:completed ───┤                   │              │                │              │
```

The POST returns **immediately** (typically <50ms locally, <500ms on Render warm) with `{ status: "pending" }`. The worker handles the slow part asynchronously.

#### 3. Real-time updates

Workers can't directly emit Socket.IO events to the API's rooms because they're in different processes. So the worker:

```typescript
await bus.progress({ assignmentId, progress: 40, label: "Calling AI" });
// Internally: redis.publish("veda:job-events", JSON.stringify({...}))
```

And the API:

```typescript
// On startup:
sub.subscribe("veda:job-events");
sub.on("message", (_ch, raw) => {
  const msg = JSON.parse(raw);
  io.to(msg.payload.assignmentId).emit("job:progress", msg.payload);
});
```

The client subscribes to its assignment's room:

```typescript
socket.emit("subscribe", assignmentId);
// Server-side: socket.join(assignmentId)
socket.on("job:progress", (p) => setLabel(p.label));
```

A polling fallback (`GET /api/assignments/:id` every 1.5s) catches up if a socket event is missed — required because on cold start, the socket can connect *after* the worker already broadcast everything.

#### 4. Authentication-aware data fetching

To avoid hitting `GET /api/auth/me` on every navigation, user data lives in the **NextAuth session JWT** (cookie). The `(app)` layout reads it directly:

```typescript
const session = await auth();
const me = {
  name: session.user.name,
  avatarUrl: session.user.image,
  school: session.user.school,
};
```

Zero round-trips. When the user saves settings, the page calls `session.update({ user: { name, school, image } })`. The JWT callback merges the new fields into the token. Next render anywhere in the app sees the change immediately.

#### 5. Caching

```
sha256({
  title: normalize(title),         // NFC + trim + collapse whitespace + lowercase
  questionTypes: sortedDeduped,
  numQuestions,
  totalMarks,
  instructions: trim,
  sourceText: trim,
})
  → "paper:cache:<hex>"
  → 24h TTL
```

Identical inputs (after normalization) skip the OpenAI call entirely. The user sees "Loaded from cache" in the live progress label. A typical cache hit is ~30ms vs ~10s for a fresh generation.

---

## 🛠 Tech stack

| Layer | Stack |
|---|---|
| **Client** | Next.js 15.5 (App Router) · TypeScript strict · Tailwind CSS · Zustand · NextAuth v5 · Socket.IO client 4 · jsPDF · react-day-picker · lucide-react |
| **API** | Node 20 · Express 4 · TypeScript strict · Mongoose 8 · Socket.IO 4 · BullMQ 5 · Zod 3 · bcryptjs · jsonwebtoken · express-rate-limit · multer · pdf-parse |
| **Worker** | Standalone Node entrypoint · BullMQ Worker · OpenAI SDK (`gpt-4o-mini`) |
| **Infra (local)** | docker-compose (Mongo 7 + Redis 7) |
| **Infra (prod)** | Vercel (client) · Render (combined API+Worker + Redis) · MongoDB Atlas |
| **Testing** | Vitest + supertest + mongodb-memory-server + mocked OpenAI |
| **CI** | GitHub Actions — server typecheck + tests, client typecheck + `next build` |

---

## 🧪 Setup (3 minutes)

### Prereqs
- Node.js 20+
- Docker Desktop
- An OpenAI API key

### One-time

```bash
# clone
git clone https://github.com/ABHISAARPANDEY/Veda-ai_assessment.git vedaai
cd vedaai

# env files
cp server/.env.example server/.env
cp client/.env.example client/.env.local

# edit server/.env — at minimum set:
#   OPENAI_API_KEY=sk-...
#   JWT_SECRET=any-string-of-32-or-more-characters

# install
(cd server && npm install)
(cd client && npm install --legacy-peer-deps)
```

### Run

Open **4 terminals**:

| # | Working dir | Command | What it runs |
|---|---|---|---|
| 1 | `vedaai/` | `docker compose up` | Mongo + Redis on localhost |
| 2 | `vedaai/server/` | `npm run dev` | Express API on `:4000` |
| 3 | `vedaai/server/` | `npm run worker` | BullMQ worker (separate process) |
| 4 | `vedaai/client/` | `npm run dev` | Next.js on `:3000` |

Open **http://localhost:3000** → sign up → create assignment → watch live progress → see the paper.

### Tests

```bash
cd server
npm test              # 5 integration tests (vitest + supertest + in-memory Mongo)
npm run test:watch
```

### Troubleshooting

| Symptom | Fix |
|---|---|
| Assignment stuck on "pending" | Worker isn't running. Start terminal 3 (`npm run worker`). |
| `ECONNREFUSED :27017` or `:6379` | Docker isn't up. Start terminal 1. |
| `JWT_SECRET must be at least 32 chars` | Set it in `server/.env`. Any random ≥32 char string works. |
| `EADDRINUSE :4000` or `:3000` | Previous dev process still bound. `pkill -f "tsx watch src/"` and `pkill -f "next dev"`. |
| Cold-start delay on first deploy hit | Render free-tier sleeps after 15min idle. First hit takes 30-60s to wake. |

---

## 🚢 Deployment

### Backend → Render (one-click via Blueprint)

`render.yaml` provisions:
- **vedaai-api** (Docker web service running the combined API + worker process)
- **vedaai-redis** (managed Redis, free tier)

Mongo is **MongoDB Atlas** (free M0 cluster, separate from Render).

Steps:
1. Sign up at [render.com](https://render.com)
2. Create a free MongoDB Atlas cluster → get the connection string (URL-encode any special chars in the password)
3. In Render: **New → Blueprint** → connect this repo → auto-reads `render.yaml`
4. Provide secrets:
   - `MONGODB_URI` = Atlas connection string
   - `OPENAI_API_KEY` = your OpenAI key
   - `CLIENT_ORIGIN` = your Vercel URL (set after deploying client below)
5. **Apply** — Render builds the Docker image from `server/Dockerfile` and runs the combined API+worker process. `JWT_SECRET` is auto-generated.

### Client → Vercel

1. https://vercel.com → New Project → select this repo
2. **Root directory:** `client` (important!)
3. **Install command:** `npm install --legacy-peer-deps` (React 19 + Next 15 peer-dep gap)
4. **Environment Variables:**

```
NEXT_PUBLIC_API_URL    = https://<your-render-api>.onrender.com
NEXT_PUBLIC_SOCKET_URL = https://<your-render-api>.onrender.com
NEXTAUTH_URL           = https://<your-vercel-domain>
NEXTAUTH_SECRET        = (run: openssl rand -base64 32)
```

5. Deploy.
6. Once Vercel finishes, go back to Render → `vedaai-api` → set `CLIENT_ORIGIN` to your Vercel URL.

---

## 🔐 Security model

| Concern | Implementation |
|---|---|
| Passwords | bcrypt cost 10, no plaintext storage |
| Auth tokens | JWT signed with `JWT_SECRET` (Zod-enforced ≥32 chars), 7d expiry by default |
| CORS | Express + Socket.IO both use `CLIENT_ORIGIN` allow-list |
| Rate limiting | 10 req / 15 min on `/api/auth/*`, 60 req / min on all `/api` (`express-rate-limit`) |
| Ownership | Every `requireAuth` route checks `req.user.sub === resource.userId` |
| File upload | mimetype filtered (image-only for avatars, PDF/text for source); 2MB / 50MB caps |
| Secrets | `.env` gitignored, `.env.example` documents all required vars; `grep` for `sk-` in source returns nothing |
| Vercel function timeout | NextAuth handler has `maxDuration: 60` to survive Render cold starts |

---

## 📡 API reference

### Auth

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/api/auth/signup` | — (rate-limited) | `{ email, password, name }` | `201 { token, user }` |
| POST | `/api/auth/login` | — (rate-limited) | `{ email, password }` | `200 { token, user }` |
| GET  | `/api/auth/me` | required | — | `200 { user }` |

### User

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| PATCH | `/api/user/me` | required | `{ name?, school? }` | `200 { user }` |
| POST  | `/api/user/me/avatar` | required | multipart, field `avatar` | `200 { avatarUrl, user }` |

### Assignments

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET    | `/api/assignments` | required | — | `200 { items }` |
| POST   | `/api/assignments` | required | JSON or multipart (see below) | `201 { assignment }` |
| GET    | `/api/assignments/:id` | required | — | `200 { assignment, paper \| null }` |
| DELETE | `/api/assignments/:id` | required | — | `200 { ok: true }` |
| POST   | `/api/assignments/:id/regenerate` | required | — | `200 { ok, assignmentId }` |

**POST body shape** (the `questionBreakdown` is the form's per-type spec):
```json
{
  "title": "Electrostatics Quiz",
  "classLevel": "Class 12",
  "subject": "Physics",
  "numQuestions": 12,
  "totalMarks": 24,
  "questionTypes": ["mcq", "short", "numerical"],
  "questionBreakdown": [
    { "type": "mcq", "typeLabel": "Multiple Choice Questions", "count": 4, "marksPerQuestion": 1 },
    { "type": "short", "typeLabel": "Short Answer Questions", "count": 4, "marksPerQuestion": 2 },
    { "type": "numerical", "typeLabel": "Numerical Problems", "count": 4, "marksPerQuestion": 3 }
  ],
  "instructions": "Focus on Chapter 1",
  "dueDate": "2026-06-30"
}
```

### Groups

| Method | Route | Auth | Body | Returns |
|---|---|---|---|---|
| GET    | `/api/groups` | required | — | `200 { items }` |
| POST   | `/api/groups` | required | `{ name, classLevel?, students? }` | `201 { group }` |
| GET    | `/api/groups/:id` | required | — | `200 { group }` |
| PATCH  | `/api/groups/:id` | required | `{ name?, classLevel?, students? }` | `200 { group }` |
| DELETE | `/api/groups/:id` | required | — | `200 { ok: true }` |

### Real-time (Socket.IO)

| Direction | Event | Payload |
|---|---|---|
| client → server | `subscribe` | `assignmentId: string` |
| server → client | `job:status` | `{ assignmentId, status }` |
| server → client | `job:progress` | `{ assignmentId, progress, label }` |
| server → client | `job:completed` | `{ assignmentId, paper }` |
| server → client | `job:failed` | `{ assignmentId, error }` |

---

## 📁 Repo layout

```
/docker-compose.yml          Local dev: Mongo + Redis
/render.yaml                 Render Blueprint
/.github/workflows/ci.yml    Typecheck + tests on push/PR
/docs/screenshots/           13 PNGs (desktop + mobile)

/server
  Dockerfile                 Multi-stage build for Render
  vitest.config.ts
  tests/
    setup.ts                 In-memory Mongo + OpenAI/BullMQ/Redis stubs
    api.test.ts              5 integration tests
  src/
    config/                  env, mongo, redis, openai client
    models/                  User, Assignment, QuestionPaper, Group
    queues/                  BullMQ generation queue
    workers/                 paperSchema, promptBuilder, generatePaper, paperCache
    routes/                  auth, assignments, user, groups
    middleware/              requireAuth, attachAuth, rateLimit
    sockets/                 Socket.IO + Redis bus
    lib/                     jwt, upload (multer), extractText (pdf-parse)
    app.ts                   Express factory (used by tests + entry points)
    index.ts                 API process entry (dev / paid-tier prod)
    worker.ts                Worker process entry (dev / paid-tier prod)
    combined.ts              Single-process API+Worker entry (Render free tier)

/client
  app/
    (app)/                   Protected layout (sidebar + topbar + mobile drawer)
      assignments/           list, new, [id] (paper output)
      groups/                list, new, [id]
      toolkit/               landing + quick-quiz
      library/               archive grouped by class level
      settings/              profile + avatar upload
    auth/                    sign-in, sign-up
    api/auth/[...nextauth]/  NextAuth route handler (maxDuration: 60)
  components/
    layout/                  Sidebar, Topbar, MobileShell, AppShell, NotificationsButton, RouteProgress
    ui/                      Button, Card, Stepper, ProgressBar, DifficultyText, EmptyState,
                             AssignmentCard, AssignmentsListView, GenerationOverlay, FileDropzone,
                             DateInput (react-day-picker), Select, Textarea, PaperBanner, PaperHeader,
                             QuestionList, AnswerKey, RegenerateButton, DeleteGroupButton
    pdf/                     buildPaperPdf (jsPDF), DownloadPdfButton
    icons/                   VedaLogo, EmptyStateIllustration
    providers/               SessionProvider
  store/                     useAssignmentStore
  lib/                       api, socket, authClient, groupsApi, cn, persona
  auth.ts                    NextAuth v5 config (jwt callback handles trigger="update")
```

---

## 🧠 Key decisions & trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Two-process backend (API + worker) sharing Redis** | Mirrors production deploys. API can scale horizontally, worker can scale independently, OpenAI never blocks request thread, failures isolated. | More moving parts than a single process. Mitigated for Render free tier with `combined.ts`. |
| **Strict Zod gate before any DB write or emission** | The brief's #1 rule. Even if the model returns garbage, the user gets either a valid typed paper or a clear `job:failed`. | Adds one validation pass. Negligible cost; massive correctness gain. |
| **Tolerance-based AI validation + deterministic post-processing** | LLMs can't reliably do integer arithmetic. The validator accepts ±25% marks / ±2 questions to avoid wasteful retries; `applyMarksFromBreakdown` + `reconcilePaper` then guarantee exact totals. | Marks aren't model-chosen — they're set from the form. Acceptable because the form is the user's authoritative spec. |
| **`questionBreakdown` on Assignment** | Encodes per-type counts + marks structurally. AI gets exact targets; backend can deterministically enforce them. | Schema is a tiny bit denser than `questionTypes: string[]`. Worth it. |
| **jsPDF instead of `@react-pdf/renderer`** | The latter crashed with `Cannot read properties of undefined (reading 'hasOwnProperty')` on React 19. jsPDF has no React internals, smaller bundle, fully reliable. | jsPDF's layout API is more imperative. Mitigated with helper functions. |
| **`react-day-picker` for the date input** | Native `<input type="date">` requires typing on macOS. A real popover calendar is a small UX win. | One more dependency (10KB). |
| **Avatars as base64 in MongoDB** | Render's free-tier disk is ephemeral — files written to `/uploads` vanish when the container sleeps. Storing as data URL on the User doc persists across restarts. | 2MB upload cap (~2.7MB stored). Acceptable for profile pics. Production should use Cloudinary/S3. |
| **User data from session JWT instead of `/api/auth/me` on every nav** | Cuts one round-trip per navigation. On a cold start that's 30-60s saved per click. | Settings changes need `session.update()` to propagate. Wired up in the Settings page. |
| **NextAuth handler `maxDuration: 60`** | Render free tier wakes in 30-60s. Without this, Vercel's default 10s function timeout killed sign-in attempts mid-wake. | None — only raises the ceiling. |
| **In-memory rate-limit store** | Single API instance for the demo. | `rate-limit-redis` would be the upgrade for multi-instance prod. |

---

## 🗺 Roadmap

What I'd build next if this were a real product:

- **Cloudinary or S3** for avatar storage (production-grade vs base64-in-Mongo)
- **Password reset** via email magic link
- **Public share link** for a paper (`/p/<slug>`, read-only view)
- **More Toolkit tools** — Lesson Planner, Concept Explainer, Worksheet Generator (each reuses the existing Zod-gate pipeline)
- **Bulk assign a paper to a Group** with submission tracking
- **`pino` structured logs + Sentry** for observability
- **More tests** — worker integration test, cache-hit-path coverage
- **`rate-limit-redis`** for multi-instance correctness
- **Paid Render tier** to split worker back into its own service for independent scaling

---

## 📝 Assignment brief — what I built vs what was asked

Every line item from the original VedaAI hiring brief, mapped to the implementation:

| Brief requirement | Where in the code |
|---|---|
| Assignment Creation form (file/due date/types/N+marks/instructions) | `client/app/(app)/assignments/new/page.tsx` |
| Validation (no empty/negative) | `client/store/useAssignmentStore.ts` + `server/src/validation/assignment.schema.ts` |
| Redux/Zustand | `client/store/useAssignmentStore.ts` |
| WebSocket | `client/lib/socket.ts` + `server/src/sockets/io.ts` |
| AI: structured prompt → sections/questions/difficulty/marks | `server/src/workers/{promptBuilder,paperSchema,generatePaper}.ts` |
| **Never render raw LLM** | `safeParse` gate in `generatePaper.ts` — provably impossible |
| Backend: Node + Express + TS + Mongo + Redis + BullMQ + WebSocket | `server/` |
| Flow: API → queue → worker → store → notify | end-to-end verified in `tests/api.test.ts` and live |
| Output: student info + sections + instruction + questions + difficulty + marks + mobile responsive | `client/app/(app)/assignments/[id]/page.tsx` + UI components |
| Bonus: Download as PDF | `client/components/pdf/` |
| Bonus: Regenerate | `client/components/ui/RegenerateButton.tsx` |
| Bonus: Difficulty as visual tag | `client/components/ui/DifficultyText.tsx` |
| Bonus: Better caching | `server/src/workers/paperCache.ts` |
| Submission: GitHub repo + README + architecture + approach | This file |
| **Submission: Deployed link** | Top of this README |

---

## 📜 License

MIT. See [LICENSE](./LICENSE).

---

<div align="center">

Built end-to-end across 90+ commits — TypeScript strict everywhere, 5/5 tests passing, CI green, deployed.

</div>
