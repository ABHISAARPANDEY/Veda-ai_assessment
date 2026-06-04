# Loom Walkthrough — 3-minute script

> **How to use this:** Open Loom (or QuickTime/Screen Studio), follow the steps below. The script is the verbatim narration; the actions list what to click. Total length aimed at ~3 minutes.

---

## Preparation (do once before recording)

1. Start the stack in three terminals:
   ```bash
   cd ~/Desktop/Veda_ai/server && npm run dev      # terminal A
   cd ~/Desktop/Veda_ai/server && npm run worker   # terminal B
   cd ~/Desktop/Veda_ai/client && npm run dev      # terminal C
   ```
2. Open Chrome → `localhost:3000`. Sign out if signed in.
3. Open a terminal showing the worker log so you can show the progress events live.
4. Have a textbook PDF ready on the desktop (any small PDF works — e.g. a single-chapter sample).
5. Set Loom to record screen + camera bubble. Voice + face is more memorable than screen alone.

---

## Scene 1 (0:00 – 0:20) — Hero

**Show:** the sign-in page (`localhost:3000/auth/sign-in`)

**Say:**
> "Hi, this is VedaAI — a full-stack AI assessment creator I built for the VedaAI hiring assignment. A teacher signs in, fills a form, and gets a structured question paper with detailed answers. Let me walk you through the whole flow in under three minutes."

---

## Scene 2 (0:20 – 0:45) — Sign up

**Show:** click "Sign up" link → fill the form

**Say:**
> "Auth is JWT-based. The backend hashes passwords with bcrypt, signs a token, and the client wraps that token inside a NextAuth session. Every protected route checks ownership, so users only see their own data."

**Action:** Sign up as "Demo Teacher" / `demo@example.com` / `password123`. Auto-routes to /assignments.

---

## Scene 3 (0:45 – 1:30) — Create assignment

**Show:** click "+ Create Your First Assignment" or "+ Create Assignment"

**Say while filling the form:**
> "I'll title this 'Electrostatics Unit Test', pick Class 12, subject Physics. Upload a textbook PDF — the server uses `pdf-parse` to extract text and feeds it to the AI as source material. Pick a due date with the calendar."

**Action:**
- Title: "Electrostatics Unit Test"
- Class/Level: Class 12
- Subject: Physics
- Upload a PDF (any small one)
- Click the date input → pick a date in the calendar popover
- Adjust the question breakdown: 4 MCQ × 1 mark, 4 Short × 2 marks, 4 Numerical × 3 marks

**Say:**
> "Notice the breakdown — 4 MCQ at 1 mark each, 4 short answers at 2 marks, 4 numerical at 3 marks. Total: 12 questions, 24 marks. The backend post-processes the AI's output to honor this exactly — even if the model gets the arithmetic slightly wrong, the marks are guaranteed."

**Action:** Click **Next**.

---

## Scene 4 (1:30 – 2:10) — Live progress + paper output

**Show:** the generation overlay appearing with the progress bar

**Say:**
> "The API just queued a BullMQ job. The worker is a separate process — it picks up the job, calls OpenAI with `response_format: json_object`, runs the response through a Zod schema, and emits events back through Redis pub/sub to the API, which broadcasts to this Socket.IO room. Watch the labels: Building prompt, Calling AI, Validating output, Saving, Done."

**Action:** Wait ~8-15 seconds. Paper appears.

**Show:** scroll through the generated paper

**Say:**
> "Here's the output — three sections, one per question type. Each MCQ has its four options listed. Difficulty is shown as a color-coded pill — green Easy, amber Moderate, red Challenging — distributed across each section, not all one level. And here at the bottom is the Answer Key, with detailed explanations including which option is correct and why."

**Action:** Scroll to the answer key, briefly show the detailed answers.

---

## Scene 5 (2:10 – 2:30) — Download PDF + Regenerate

**Show:** the "Download as PDF" and "Regenerate" buttons

**Action:** Click "Download as PDF" → PDF opens. Show it briefly.

**Say:**
> "Real PDF, not browser print — uses jsPDF, inline colored difficulty labels, full answer key. And one click on Regenerate re-runs the entire pipeline with the same inputs — useful if a teacher wants a fresh variant."

---

## Scene 6 (2:30 – 2:50) — Extras

**Show:** sidebar → click "My Groups"

**Say:**
> "Beyond the core flow there's a Groups CRUD for organizing students, a Library that archives completed papers by class level, and an AI Teacher's Toolkit with a live Quick Quiz tool that reuses the same generation pipeline. All per-user scoped."

**Action:** Click through Groups list → Library → Toolkit. Don't dwell.

---

## Scene 7 (2:50 – 3:00) — Close

**Show:** Settings page

**Action:** Briefly show settings — name, school, avatar upload.

**Say:**
> "Settings lets a teacher edit their profile and upload an avatar. The codebase has 5 integration tests, GitHub Actions CI, rate-limited auth, and a Render Blueprint plus Vercel deploy ready to go. Source on GitHub, link in the description. Thanks for watching."

**Action:** End recording.

---

## Tips

- **Use voice — don't read.** Talk like you're showing a friend.
- **Keep the cursor moving.** Static screens lose attention.
- **Show the worker log briefly** during Scene 4 — proof the events are live.
- **Don't apologize** for anything you skip. Confidence > completeness.
- **Pin to ~3:00.** Reviewers watch the first 30s and the last 15s closely. Make those count.
- **Once recorded, paste the Loom URL into the README's "Demo Video" section.**
