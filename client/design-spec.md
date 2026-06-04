# VedaAI — Phase 3 Design Spec

> Source of truth: the 9 reference screenshots in `client/design-reference/ref-1-*.png` through `ref-9-*.png`, supplied directly by the user. These supersede the rate-limited Figma MCP pulls.
>
> **Build target:** pixel-perfect to the references. Where a value is visually estimated (e.g. "~24px") it is a measurement read off the screenshots; where it is taken from explicit text in the design it is exact.

---

## Reference image index

| File | Frame | Notes |
|------|-------|-------|
| `ref-1-dashboard-empty-desktop.png` | Dashboard — No assignments yet | Sidebar + topbar + centered empty state |
| `ref-2-dashboard-empty-mobile.png` | Dashboard — No assignments yet (mobile) | Bottom tab bar, floating "+" |
| `ref-3-assignments-list-desktop.png` | Assignments index | 2-col card grid, filter + search, hover menu, floating "+ Create Assignment" |
| `ref-4-empty-list-placeholder.png` | Placeholder card "Created Assignments will appear here" | Used between empty and populated states |
| `ref-5-assignments-list-mobile.png` | Assignments index (mobile) | Single column, mobile header, bottom tabs |
| `ref-6-create-form-desktop.png` | Create Assignment form | Progress bar + Assignment Details card |
| `ref-7-create-form-mobile.png` | Create Assignment form (mobile) | Stacked form + Previous/Next |
| `ref-8-output-paper-desktop.png` | Generated paper output | Dark AI banner + white paper card + answer key |
| `ref-9-output-paper-mobile.png` | Generated paper output (mobile) | Single-column paper |

---

## Color palette

| Token | Value | Where |
|-------|-------|-------|
| `--page-bg` | `#EAEBEB` / `gray-200`-ish | Page background behind cards |
| `--card-bg` | `#FFFFFF` | Sidebar, topbar pill, content cards, paper |
| `--card-inset` | `#F5F5F5` | Form card inset, input fields |
| `--surface-2` | `#F0F0F0` | Active nav highlight, school card at sidebar bottom |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#7A7A7A` | Subtitles, helper text |
| `--text-muted` | `#A9A9A9` | Placeholders, "JPEG, PNG, upto 10MB" |
| `--border-subtle` | `#E5E5E5` | Card borders, input outlines |
| `--border-dashed` | `#D4D4D4` | Dropzone outline |
| `--btn-primary` | `#1A1A1A` (near-black) | Dark pill buttons, AI Toolkit button |
| `--btn-primary-text` | `#FFFFFF` | Text on dark pill |
| `--accent-orange` | `#F26B3A` | "32" badge, notification dot, mobile floating "+", AI Toolkit glow |
| `--accent-orange-soft` | `#FFE4D9` | Faint glow ring on AI Toolkit |
| `--status-green` | `#1AB45D` | Green status dot before headings |
| `--danger-red` | `#E03131` | "Delete" menu item, X in illustration |
| `--diff-easy` | `#1F8B4D` | "[Easy]" tag color (subtle tint) |
| `--diff-medium` | `#B86E00` | "[Moderate]" tag color |
| `--diff-hard` | `#C7361C` | "[Challenging]" tag color |

> Difficulty: the Figma paper renders difficulty as plain bracketed text (e.g. `[Easy]`). To honour both pixel-perfect AND the original "color-coded" intent, the bracket characters stay default text color and **only the word inside** is tinted — keeps the printed-paper feel while colour-coding semantically.

---

## Typography

The screenshots show a clean, slightly compressed modern sans — closest match in widely-available webfonts is **Geist** or **Inter**. I'll use **Inter** via `next/font` (Geist is also fine if preferred). All values are visual estimates from the references.

| Style | Class | Use |
|-------|-------|-----|
| Display | 28–32 / 700 | Empty state "No assignments yet", "Quiz on Electricity" card titles |
| H1 | 22–24 / 700 | "Create Assignment", "Assignments" page titles |
| H2 | 16–18 / 600 | "Assignment Details", "Section A" |
| H3 / Card title | 14–15 / 600 | Input labels, "Question Type" |
| Body | 14 / 400 | Form helpers, paragraph copy |
| Body small | 12–13 / 400 | "JPEG, PNG, upto 10MB", placeholders |
| Tag / brackets | 13 / 500 | `[Easy]` `[Moderate]` `[Challenging]` |
| Sidebar nav | 14 / 500 | "Home", "My Groups" |
| Button | 14 / 600 | "Browse Files", "Next", "+ Create Assignment" |

---

## Spacing scale (Tailwind)

Use Tailwind default `4px` step. Most visible spacing maps to:
- `gap-2` / `p-2` → 8px
- `gap-3` / `p-3` → 12px (typical nav item vertical padding)
- `gap-4` / `p-4` → 16px (card internal small)
- `gap-6` / `p-6` → 24px (card internal medium)
- `gap-8` / `p-8` → 32px (card internal large; main content padding)
- Sidebar / topbar gutter from page edge: 16px
- Card radius: `rounded-2xl` (16px) for content cards, `rounded-3xl` (24px) for the AI banner and primary pill buttons, `rounded-full` for pill buttons and circular icons

---

## App shell (used on every page)

```
┌───────────────────────────────────────────────────────────────────────┐
│ page bg #EAEBEB                                                       │
│                                                                       │
│ ┌─── sidebar (white, ~270px) ────┐  ┌─── topbar (white pill) ──────┐  │
│ │ ▢ VedaAI                        │  │ ← ▦  Assignment    🔔 ⚪ J ▾ │  │
│ │                                 │  └────────────────────────────┘  │
│ │ ┌─────────────────────────────┐ │                                  │
│ │ │ ✨ AI Teacher's Toolkit     │ │  ┌── main content ─────────────┐ │
│ │ │   (dark pill, orange glow)  │ │  │ (per-page content here)     │ │
│ │ └─────────────────────────────┘ │  │                             │ │
│ │                                 │  └─────────────────────────────┘ │
│ │ ▦ Home (active highlight)       │                                  │
│ │ ▢ My Groups                     │                                  │
│ │ 📄 Assignments     ●32          │                                  │
│ │ 📖 AI Teacher's Toolkit         │                                  │
│ │ 🗂 My Library                   │                                  │
│ │                                 │                                  │
│ │ ⚙ Settings                      │                                  │
│ │ ┌─────────────────────────────┐ │                                  │
│ │ │ 🏫 Delhi Public School      │ │                                  │
│ │ │    Bokaro Steel City        │ │                                  │
│ │ └─────────────────────────────┘ │                                  │
│ └─────────────────────────────────┘                                  │
└───────────────────────────────────────────────────────────────────────┘
```

### Sidebar (~270px wide, full viewport height with 16px margin)
- White bg, `rounded-2xl`, soft shadow
- VedaAI brand row: 12px gap, dark square logo + "VedaAI" wordmark
- "AI Teacher's Toolkit" button:
  - dark `#1A1A1A` bg, white text, sparkle icon left
  - rounded-full pill
  - 12–14px vertical padding, 24px horizontal
  - thin orange ring (`#F26B3A`) + outer soft glow (use box-shadow with the orange-soft tone)
- Nav list:
  - Each item: icon + label, 12px vertical padding, full row click target
  - **Active state** (e.g. "Home" in ref-1): subtle gray pill bg, slightly bolder text
  - Badge ("32"): orange pill, white text, 11–12px font
- Bottom group:
  - "Settings" item
  - School chip: `surface-2` bg, rounded-2xl, school crest + 2-line text

### Topbar (right of sidebar, white pill)
- `rounded-full` overall, padded ~12px vertical, ~24px horizontal
- Left: circular back arrow, grid icon, breadcrumb text ("Assignment", "Create New", etc.)
- Right: bell with orange dot, avatar circle, "John Doe", caret

### Mobile shell (refs 2, 5, 7, 9)
- Top: VedaAI header (white pill spanning width, bell + avatar + hamburger ☰ on right)
- Bottom: dark pill tab bar with 4 tabs (Home / Assignments / Library / AI Toolkit), one active in white
- Page content scrolls between
- Floating orange "+" button bottom-right above tab bar (assignments list mobile)
- No sidebar; menu accessed via ☰

---

## Page 1 — Dashboard / Assignments index empty state (ref-1, ref-2)

Centered column:
1. Illustration (~240px square; paper + magnifier + red X + sparkles) — can be inline SVG composite or a single SVG
2. **"No assignments yet"** — Display, centered
3. 3-line description, gray, centered, max-width ~480px
4. **"+ Create Your First Assignment"** — dark pill, white text, plus icon left

On mobile (ref-2): same layout, narrower, floating orange "+" bottom-right above the dark tab bar.

---

## Page 2 — Assignments index populated (ref-3, ref-5)

- Status row at top of content: green dot + **"Assignments"** + subtitle "Manage and create assignments for your classes."
- Filter/search bar in a white card:
  - Left: filter funnel icon + "Filter By" (button/pill)
  - Right: search input with magnifier, placeholder "Search Assignment"
- **Card grid** (2 cols on desktop, 1 col mobile, ~24px gap):
  - Each card: white, `rounded-2xl`, ~24px padding, soft shadow
  - Title (e.g. "Quiz on Electricity"): bold, underlined, ~22px
  - 3-dots menu top-right (opens a small white card with "View Assignment" / "Delete" red)
  - Bottom row: **Assigned on**: `DD-MM-YYYY`  (left)  **Due**: `DD-MM-YYYY` (right) — `Assigned on` / `Due` labels are bold
- Sticky/floating **"+ Create Assignment"** dark pill at bottom-center on desktop; orange floating "+" bottom-right on mobile

---

## Page 3 — Create Assignment form (ref-6, ref-7) — PRIMARY BUILD TARGET

### Header row
- Green dot + **"Create Assignment"** title + "Set up a new assignment for your students" subtitle

### Step progress bar
- Two segments side-by-side, full content width, ~6px tall
- First segment: dark `#1A1A1A` (current step = "Assignment Details")
- Second segment: light gray (next step — Phase 3 just has the one step; we keep the visual)

### Assignment Details card
- Off-white inset `#F5F5F5` bg, `rounded-2xl`, ~32px padding
- Heading **"Assignment Details"** + "Basic information about your assignment" subtitle
- **Dropzone**:
  - Full width, ~280px tall
  - Dashed border `#D4D4D4`, `rounded-2xl`, white bg
  - Centered cloud upload icon (lucide `cloud-upload`)
  - "Choose a file or drag & drop it here" (body, 600)
  - "JPEG, PNG, upto 10MB" muted small
  - "Browse Files" white pill button (border, no fill)
- Caption under dropzone, centered, muted: "Upload images of your preferred document/image"
- **Due Date**:
  - Label "Due Date" bold
  - Native date input styled to match: white-ish bg, full-width, rounded-xl, calendar icon right
  - Placeholder "DD-MM-YYYY"
- **Question Type table**:
  - Column headers left-aligned: "Question Type", "No. of Questions", "Marks" (label row, gray)
  - Rows (initial = 4 visible in ref-6):
    1. Multiple Choice Questions
    2. Short Answer Questions
    3. Diagram/Graph-based Questions
    4. Numerical Problems
  - Each row: dropdown (select) + × remove + stepper (count) + stepper (marks)
  - Stepper: `[−]` + value + `[+]`; circular buttons
  - "**+ Add Question Type**" pill button below table — dark pill, white text
  - Right of pill: **"Total Questions: 15"** / **"Total Marks: 60"** stacked text
- **Additional Information**:
  - Label "Additional Information (for better output)"
  - Textarea, full-width, rounded-xl, white bg, ~100px tall, placeholder "e.g. Emphasis on chapters 1, 4 from NCERT class 5"

### Footer buttons (sticky-ish bottom)
- Left: **"← Previous"** white pill (border)
- Right: **"Next →"** dark pill — this is the submit button (POST → /api/assignments)

---

## Page 4 — Generation in progress

Not in the supplied references. Per the original Phase 3 spec the design "expects an inline state on the form page or output page". My plan: a **loading overlay/modal** rendered after Next is pressed, styled to match the design system:

- Centered card on light-gray scrim
- Sparkle icon spinner top
- **"Generating your assignment…"** title
- Status line that reflects the current `job:progress` label (Queued → Building prompt → Calling AI → Validating output → Saving → Done)
- Thin progress bar (uses the same step-bar style as the form), percentage from `job:progress`
- On `job:completed`: route to output page with the paper
- On `job:failed`: show error state (red icon + message + "Try again" button)
- "Loaded from cache" label also flows through this naturally

---

## Page 5 — Generated paper output (ref-8, ref-9)

### AI banner (top)
- Dark `#1A1A1A` `rounded-3xl` card, full content width, padded ~20px
- Left: sparkle icon (white)
- Center: "Certainly, {Name}! Here are customized Question Paper for your {grade/subject context} on the {topic} chapters:" — white text
- Right: **"Download as PDF"** white pill button with download icon

> Banner text template — driven by the assignment.title and the user's school (hardcoded "Lakshya" / "CBSE Grade 8 Science" / "NCERT chapters" in the Figma sample). For now we'll hardcode "Lakshya" as the user first name to match the design verbatim, with assignment.title slotted in.

### Paper card
- White, `rounded-2xl`, large padding (~48px), soft shadow
- Centered school header: "Delhi Public School, Sector-4, Bokaro" (hardcoded per design)
- Centered "Subject: {subject}" / "Class: {class}" — derived from form context where possible; defaults to "English" / "5th" to match the design
- **Meta row**: "Time Allowed: 45 minutes" left, "Maximum Marks: {totalMarks}" right
- "All questions are compulsory unless stated otherwise." left
- **Student info fields** (each on its own line, with `___________` style underline):
  - Name: \_\_\_\_\_
  - Roll Number: \_\_\_\_\_
  - Class: 5th  Section: \_\_\_\_\_
  - These are EDITABLE inputs (read-only underlined inputs styled as paper lines)
- For each section:
  - Centered "Section A" / "Section B" headings (bold)
  - Section title bold left-aligned (e.g. "Short Answer Questions")
  - Section instruction italic gray (e.g. "Attempt all questions. Each question carries 2 marks")
  - Numbered list of questions:
    - `{n}. [{difficulty}] {question text}. [{marks} Marks]`
    - difficulty in tinted color per `--diff-*` token
- "End of Question Paper" bold centered
- **Answer Key:** bold heading, numbered answer list

The backend's `QuestionPaperDTO` doesn't include answers (only questions). The Figma shows answers — to truthfully match we'd need to extend the backend. **For now, hide the Answer Key section and document this as a Phase 3.1 follow-up.** Alternatively, I can extend the backend Zod schema and prompt to ask the model for an `answers` array — small, additive change. I'll note this as a decision point for the user.

---

## Backend ↔ form field mapping (already in design-spec — restated for clarity)

| Form field | API field | Notes |
|------------|-----------|-------|
| File upload (JPEG/PNG, ≤10MB) | `sourceText?` | Currently a string field. **Image content cannot be sent as text** — for Phase 3 the upload is accepted in UI but not transmitted (matches Figma without breaking backend). Phase 4 could OCR the image client-side. |
| Due Date | `dueDate?` | ISO string from date input |
| Question Type rows | `questionTypes: string[]` | Selected dropdown values |
| Sum of "No. of Questions" | `numQuestions: number` | Computed from row steppers |
| Sum of "Marks" | `totalMarks: number` | Computed from row steppers |
| Additional Information | `instructions?: string` | Free text |

---

## Open questions for the user (before plan-writing)

1. **Scope:** "whole design" — does this mean *all* the screens in the references (dashboard empty + assignments list + create form + generating + output)? Or just the create form + generating + output that the original Phase 3 spec calls out? The full set adds ~2 pages but matches the design completely.
2. **Answer Key on output:** the Figma shows an Answer Key after the questions. The current backend doesn't return answers. Two options:
   - **A:** Hide the Answer Key for now; ship without it (matches data, ~10% off-design).
   - **B:** Extend the Zod schema + prompt to return `answers: string[]` per question and re-run Phase 2 acceptance.
3. **File upload:** the Figma promises image upload (JPEG/PNG ≤10MB). The backend takes `sourceText` (a string). For Phase 3 should we:
   - **A:** Accept the file in UI but not send it (pure cosmetic).
   - **B:** Send the filename only as a hint inside `instructions`.
   - **C:** OCR client-side with tesseract.js and put extracted text in `sourceText` (~40MB JS bundle).
4. **Static personalization:** the AI banner says "Certainly, Lakshya!" and the school is "Delhi Public School, Sector-4, Bokaro". The backend has no auth/users/schools. I'll hardcode these to match the Figma. Confirm?
