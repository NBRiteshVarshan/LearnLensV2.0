# LearnLens V2.0 — AI Agent Context Document

> This document is a complete analytical and technical briefing for an AI agent
> working on this codebase. Read it in full before touching any file.
> Last updated: 2026-08-12.

---

## 1. What This Project Is

**LearnLens** is a single-page academic learning OS built for students. It combines:
- Per-subject workspaces (Math, Programming, Biology, Literature, Physics, Chemistry, History + custom)
- An AI study assistant (RAG over uploaded PDFs: Q&A, summarise, quiz)
- A Pomodoro-style deep study timer
- A weekly calendar with event scheduling
- A real-time analytics engine (focus hours, streak, recall avg)
- A todo list and activity stream on the dashboard

It is a **demo-first product** — it ships with a full fake dataset and a toggle to
switch from demo mode to real (empty) mode. The backend provides AI features only;
all UI state lives in the frontend (React hooks + localStorage).

---

## 2. Exact Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Frontend | React + Vite | React 19.2.4, Vite 8.0.1 |
| Language | Plain JSX | **No TypeScript**. `.jsx` files only. |
| Styling | CSS custom properties | **No Tailwind, no CSS Modules, no styled-components** |
| State | React built-ins | `useState`, `useEffect`, `useContext`, `useRef`, `useMemo` — **no Zustand, no Redux** |
| Animations | CSS `@keyframes` + inline transitions | **No Framer Motion** |
| Markdown | `react-markdown@10.1.0` | Used only in `AITools.jsx` SummaryPanel |
| HTTP (frontend) | `fetch` (native) | `axios` is listed in package.json but not used in current code |
| Backend | FastAPI + Uvicorn | Python, single file `backend/main.py` |
| Vector DB | Qdrant | Local file-based, stored in `backend/qdrant_data/` |
| Embeddings | `sentence-transformers` | Model: `all-MiniLM-L6-v2`, 384-dim, cosine |
| LLM | Groq API | Model: `llama-3.3-70b-versatile`, temp 0.3 |
| PDF parsing | PyMuPDF (`fitz`) | Text extraction per page |

**Never assume** Next.js, TypeScript, Tailwind, shadcn, Framer Motion, or Zustand
are present — they are not.

---

## 3. How to Run

```bash
# Backend (port 8000)
cd backend
py -3 -m uvicorn main:app --reload --port 8000

# Frontend dev server (port 5173, proxies /api → 8000)
cd frontend
npm run dev
```

- Requires `backend/.env` with `GROQ_API_KEY=...`
- Production: `npm run build` → `frontend/dist/` served by FastAPI at `/`
- In dev, Vite proxy handles `/api` → `http://localhost:8000`
- In prod, frontend and backend are on the same port 8000

**Critical:** All frontend API calls must use relative paths (`/api/...`), never
hardcoded `http://localhost:8000`. The `const API = ""` pattern is used for this.

---

## 4. Directory Structure

```
LearnLensV2.0/
├── CLAUDE.md                        ← Full project instructions (read first)
├── AGENT_CONTEXT.md                 ← This file
├── backend/
│   ├── main.py                      ← Entire FastAPI app (all routes + RAG logic)
│   ├── requirements.txt             ← Pinned Python deps
│   ├── pdf_store.json               ← Persisted PDF metadata (survives restarts)
│   ├── uploads/                     ← Uploaded PDF files (UUIDs as filenames)
│   └── qdrant_data/                 ← Local Qdrant vector store (binary)
└── frontend/
    ├── package.json
    └── src/
        ├── main.jsx                 ← React entry point, mounts <App />
        ├── App.jsx                  ← Root: routing, global state, modals
        ├── styles/
        │   └── tokens.css           ← Design system (all CSS vars + keyframes)
        └── learnlens/
            ├── Shell.jsx            ← Sidebar, TopBar, CommandBar, Ic icons, Card/Pill/Btn primitives
            ├── Dashboard.jsx        ← Today view (EmptyDashboard + LiveDashboard)
            ├── Workspaces.jsx       ← Per-subject workspace router + all subject views
            ├── Views.jsx            ← Calendar_View + Analytics view
            ├── AITools.jsx          ← Upload/Ask/Summarise/Quiz tabs
            ├── StudyTimer.jsx       ← TimerProvider, useTimer, TimerPill, TimerPanel
            ├── useStudyTimer.js     ← Pure timer logic hook (no JSX)
            ├── TweaksPanel.jsx      ← Settings drawer + useTweaks hook
            ├── data.js              ← useAppData() hook + all demo data
            └── useStudyAnalytics.jsx ← Analytics engine (sessions, streaks, AI events)
```

---

## 5. Routing Model

All routing is a **single state object** in `App.jsx`. No React Router.

```js
const [route, setRoute] = useState({ view: "dashboard" });

// Possible values:
// { view: "dashboard" }
// { view: "subject", id: "math" }    // id = subject.id
// { view: "calendar" }
// { view: "analytics" }
// { view: "inbox" }
// { view: "aitools" }
```

`setRoute` is prop-drilled to `Sidebar` and any component that needs to navigate.

**Subject IDs** for demo subjects: `"math"`, `"prog"`, `"bio"`, `"lit"`, `"phys"`, `"chem"`, `"hist"`.
Custom subjects have IDs like `"custom_<random>"`.

---

## 6. Global State in App.jsx

```js
// Routing
const [route,         setRoute]        = useState({ view: "dashboard" });

// Modal visibility
const [cmdOpen,       setCmdOpen]      = useState(false);
const [addSubjOpen,   setAddSubjOpen]  = useState(false);
const [timerOpen,     setTimerOpen]    = useState(false);

// Settings / tweaks (persisted to localStorage via useTweaks)
const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
// t shape: { theme, workflow, density, accent, showWorkflowChrome, demo }

// User-created subjects (persisted to localStorage "ll-user-subjects-v1")
const [userSubjects,  setUserSubjects] = useState(loadSavedSubjects);

// Forces all useAppData() callers to re-read
const [, forceTick] = useState(0);
```

**`window.__LL_DEMO`** (boolean): set by App.jsx from `t.demo`. When `true`, all
`useAppData()` calls return full demo dataset. When `false`, return empty/real data.

**`window.__LL_USER_SUBJECTS`**: array set by App.jsx = `userSubjects`, read by
`useAppData()` in real mode.

---

## 7. Design System

All colours and spacing live in `frontend/src/styles/tokens.css` as CSS custom
properties. **Never hardcode color values.**

### Key CSS Variables

```css
/* Backgrounds */
--bg, --surface, --surface-2, --surface-3

/* Borders */
--line, --line-soft, --line-strong

/* Text (descending prominence) */
--ink, --ink-2, --ink-3, --ink-4

/* Brand accent (indigo by default, user-configurable) */
--accent, --accent-soft, --accent-line

/* Semantic colors */
--ok / --ok-soft          /* green — success, streak */
--warn / --warn-soft      /* amber — caution */
--due / --due-soft        /* orange-red — deadlines */

/* Shadows */
--shadow-sm, --shadow-md, --shadow-lg

/* Typography */
--font-sans    /* IBM Plex Sans */
--font-serif   /* Newsreader */
--font-mono    /* JetBrains Mono */
--fs-12 … --fs-48

/* Spacing / Radii */
--r-xs, --r-sm, --r, --r-md, --r-lg, --r-xl
```

### Subject Colors

Subject-specific colors are scoped via `data-subject` attribute:
```jsx
<div data-subject="math">
  {/* Now exposes --s, --s-soft, --s-line as CSS vars */}
</div>
```

For **custom subjects**, use `getCustomColorVars(colorKey)` from `Shell.jsx`
which returns inline style `{ "--s": ..., "--s-soft": ..., "--s-line": ... }`.

### Keyframe Animations (defined in tokens.css)

| Name | Use |
|---|---|
| `ll-fade-in` | Entrance slide-up + fade (general) |
| `ll-pulse-soft` | Slow indicator pulse |
| `ll-panel-in` | Modal entrance (scale + fade) |
| `ll-breathe` | Subtle opacity breathe (timer running) |
| `ll-breathe-glow` | Radial glow expand/contract |
| `ll-completion-flash` | Full-panel flash on timer done |
| `ll-glow-pulse` | Box-shadow pulse (timer pill on completion) |

### Shared UI Primitives (from Shell.jsx)

```jsx
<Card>               // surface box with border + shadow
<Pill tone="ok|warn|due|accent|subject">   // inline badge
<Btn variant="default|primary|accent|ghost" icon={Ic.X}>
<SectionTitle kicker="..." title="..." action={...} />
```

`Ic.*` — all SVG icons inline (no icon library). Available icons:
`Home, Books, Cal, Chart, Search, Inbox, Bell, Plus, Sun, Moon, Check, Dot,
Pdf, Video, Code, Note, Card, Quiz, Beaker, Atom, Sigma, Cell, Quill, Globe,
Chev, ChevD, Cmd, Flame, Timer, Filter, Bookmark, Sparkle, Cog, Logout, Users,
Bot, Trash, Upload, Send, X`

### CSS Utility Classes

`.mono`, `.serif`, `.tabular`, `.label-xs`, `.muted`, `.dim`

---

## 8. Styling Conventions

### Inline styles — always
```jsx
// Correct
<div style={{ background: "var(--surface)", borderRadius: "var(--r)" }}>
```

### Hover via mouse events — no CSS hover classes
```jsx
onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
onMouseLeave={e => e.currentTarget.style.background = "transparent"}
```

### Modal pattern
```jsx
// Backdrop
<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)", zIndex: 200 }}
     onClick={onClose}>
  // Inner card
  <div style={{ ... }} onClick={e => e.stopPropagation()}>
```

---

## 9. Data Layer — useAppData()

`data.js` exports `useAppData()` hook consumed by all components.

```js
const d = useAppData();
// Available fields:
d.subjects      // array of subject objects
d.todayTasks    // array of task objects
d.activity      // array of activity log entries
d.aiActivity    // array of AI event records
d.weekFocus     // array of daily focus seconds
d.friends       // array of friend objects (demo only)
d.inbox         // array of inbox messages (demo only)
d.calEvents     // array of calendar events
d.user          // user object { name, handle, xp, streak, ... }
d.demo          // boolean — current mode
```

**Subject object shape:**
```js
{
  id, key, name, code, title, instructor,
  progress,         // 0–100
  streak,           // days
  hours,            // total study hours
  tag,              // category label
  session,          // fallback next-session string
  flavor,           // "formula" | "code" | "diagram" | "reading" | "custom"
  next: { kind, title, due, urgency },
  units, unitDone, resourceCount,
  // Custom subjects also have:
  type: "custom",
  color,            // key into CUSTOM_COLORS
  icon,             // key into Ic object
  description,
  createdAt
}
```

---

## 10. localStorage Persistence Keys

| Key | Contents | Owner |
|---|---|---|
| `ll-user-subjects-v1` | User-created subjects array | App.jsx |
| `ll-sidebar-collapsed` | Boolean | Shell.jsx |
| `ll-timer-v1` | Timer state object | useStudyTimer.js |
| `ll-calendar-events-v1` | Calendar events array | Views.jsx |
| `ll-resources-v1` | All subject resources (PDFs + links) | Workspaces.jsx |
| `ll-todo-v1` | Todo items array | Dashboard.jsx |
| `ll-analytics-sessions-v1` | Study session records | useStudyAnalytics.jsx |
| `ll-analytics-recall-v1` | Quiz result records | useStudyAnalytics.jsx |
| `ll-analytics-ai-v1` | AI activity events (last 30) | useStudyAnalytics.jsx |
| `ll-tweaks-v1` | Tweak settings (theme, workflow, etc.) | TweaksPanel.jsx |

---

## 11. Backend API Contract

Base path: `/api`. All endpoints return JSON.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/health` | — | `{ status, qdrant_ok, collection }` |
| POST | `/api/upload` | multipart: `file` (PDF) | `{ pdf_id, filename, page_count, char_count }` |
| POST | `/api/ingest` | `{ pdf_id }` | `{ ok, chunks_created }` |
| POST | `/api/ask` | `{ question, pdf_ids[] }` | `{ answer, sources_used[] }` |
| POST | `/api/summary` | `{ pdf_ids[] }` | `{ summary }` (Markdown string) |
| POST | `/api/quiz` | `{ pdf_ids[], difficulty?, mode?, pyq_text? }` | `{ quiz: [{question, options[], answer, explanation}] }` |
| POST | `/api/extract-text` | `{ pdf_id }` | `{ text }` |
| GET | `/api/pdfs` | — | `[{ pdf_id, filename, page_count, char_count, chunks }]` |
| DELETE | `/api/pdf/{pdf_id}` | — | `{ ok }` |

**Quiz format** (10 questions, exact shape):
```json
{
  "quiz": [
    {
      "question": "...",
      "options": ["A. text", "B. text", "C. text", "D. text"],
      "answer": "A",
      "explanation": "..."
    }
  ]
}
```

Frontend parses options with: `opt.replace(/^[A-D]\.\s*/, "")` to strip prefix.

**RAG pipeline:**
1. Query embedding via `all-MiniLM-L6-v2`
2. Qdrant `query_points()` (v1.10+ API — NOT `search()`)
3. Context assembled ≤5500 chars, passed to Groq LLM
4. System prompt instructs grounded, concise answers

---

## 12. Backend Architecture Notes

- **All logic in one file:** `backend/main.py` — no separate service modules
- **Initialization:** `QdrantClient` and `SentenceTransformer` are created inside
  FastAPI `lifespan` handler (not module-level) to avoid double-open crash on `--reload`
- **PDF store persistence:** `pdf_store` dict is serialised to `backend/pdf_store.json`
  on every write; loaded on startup; survives server restarts
- **Qdrant collection:** `"learnlens_chunks"`, 384-dim, cosine distance
- **Stale lock file** auto-deleted on startup to prevent Qdrant crash
- **Windows UTF-8 fix:** `sys.stdout.reconfigure(encoding="utf-8")` before any print
- **CORS:** allows `http://localhost:5173` (Vite dev) and production domain

---

## 13. Study Timer System

### Architecture
```
TimerProvider (wraps entire App, in StudyTimer.jsx)
  ↓ context via useTimer()
  TimerPill (top bar)     — reads status, displaySecs
  TimerPanel (modal)      — reads all, calls all actions
  FocusSessionCard        — reads status/progress/displaySecs
  Dashboard StatCell      — reads weekly focus from useAnalytics()
```

### State Shape (in useStudyTimer.js)
```js
{
  mode: "study" | "short" | "long",      // 25/5/15 min
  status: "idle" | "running" | "paused" | "completed",
  startedAt: null | timestamp,           // Date.now() when last started
  snapSecs: number,                      // seconds remaining at last pause
  sessionCount: number,
  totalFocusSecs: number,
}
```

### Accuracy Mechanism
`remaining = snapSecs - (Date.now() - startedAt) / 1000`
Recalculated fresh on every RAF tick. Survives tab switches and system sleep.
Same formula applied on reload to check if timer expired while tab was closed.

### Persistence
Full state → `localStorage["ll-timer-v1"]` on every state change.

---

## 14. Analytics Engine (useStudyAnalytics.jsx)

### Architecture
```
AnalyticsProvider (wraps App, inside TimerProvider)
  ↓ context via useAnalytics()
  TimerWatcher    — null component, bridges timer → analytics
  Dashboard       — reads weekDailySecs, streak, recallAvg
  AITools.jsx     — calls emitAIActivity() (no context needed)
  Workspaces.jsx  — calls emitAIActivity() for resource indexing
```

### emitAIActivity (fire-and-forget, callable without context)
```js
emitAIActivity({ type, label, subj, status })
// dispatches CustomEvent on window; AnalyticsProvider listens and persists
```

### Key Computed Values
- **weekFocus**: total seconds in current Mon–Sun ISO week + daily sparkline
- **streak**: walks backward from today; starts yesterday if today < 20-min threshold
- **recallAvg**: rolling mean over last 7 days of quiz events
- **isRecentAI**: true if last AI event was within 15 seconds (drives UI highlights)

---

## 15. Subject Workspaces (Workspaces.jsx)

`<SubjectRouter id={route.id} />` selects the workspace by subject ID.

| Subject ID | Component | Key Tabs |
|---|---|---|
| math, phys | MathWorkspace | overview, problems, theorems, resources |
| prog | ProgWorkspace | overview, files, concepts, resources |
| bio, chem | BioWorkspace | overview, diagrams, glossary, resources |
| lit, hist | LitWorkspace | overview, passages, annotations, resources |
| `custom_*` | GenericSubject | notes, resources |

**All workspaces have a Resources tab** powered by `ResourcesPanel` / `useSubjectResources(subjectId)`.

### useSubjectResources(subjectId) Hook
- Reads/writes `ll-resources-v1` keyed per subject
- `addPDF(file)`: validates ≤2MB → saves as base64 dataUrl → async backend upload + ingest → marks `indexed: true`
- `addLink({ name, url })`: saves link reference
- PDF `Open` button: decodes base64 → Blob → `URL.createObjectURL` → new tab

### SubjectHeader
- Shows subject name, code, instructor, next session
- `useNextCalSession(subjectId)` pulls next future calendar event for this subject
- Falls back to `s.session` string if no calendar event found

---

## 16. Navigation / Features Currently Active

Navigation rail (Sidebar) shows:
- **Today** (dashboard)
- **Calendar** (weekly grid with event composer)
- **Analytics** (focus hours, streak, recall, AI activity table)
- Per-subject items

**Removed features** (do not re-add without explicit request):
- Library (removed 2026-06-18)
- Lectures tab in workspaces (removed 2026-07-01)
- Notification bell (removed 2026-07-07)
- Quick Practice workflow option (removed latest session)

---

## 17. Key Conventions — Must Follow

1. **No TypeScript** — JSX only, `.jsx` files
2. **No Tailwind / CSS modules** — inline `style={{}}` always
3. **No external state libraries** — React hooks only
4. **No comments explaining WHAT** — only WHY when non-obvious
5. **No hardcoded colors** — always `var(--token-name)`
6. **Hover state via mouse events** — `onMouseEnter`/`onMouseLeave`
7. **Relative API paths** — `fetch("/api/...")` not `fetch("http://...")`
8. **Subject colors via data-subject** — `<div data-subject={s.id}>` for scoped `--s` vars
9. **Custom subject colors via getCustomColorVars(s.color)** — inline style spread
10. **Modal pattern** — fixed inset-0 backdrop + stopPropagation on inner card
11. **Qdrant v1.10+ API** — use `query_points()` not `search()`; `.points` on response
12. **Backend: init in lifespan** — not at module level

---

## 18. Known Limitations

- `pdf_store` is in-memory with JSON backup — no real database
- Uploaded PDFs are stored as raw files in `backend/uploads/` — no cleanup
- Resources stored in localStorage as base64 — 2MB cap per PDF, total ~5MB localStorage limit
- No authentication — single-user app
- `userSubjects` stored in localStorage — not synced to backend
- Demo mode is client-side only — `window.__LL_DEMO` flag
- Quiz retry logic (3 attempts) may still fail on malformed LLM output

---

## 19. Recent Change History (chronological)

| Date | Change |
|---|---|
| 2026-05-22 | Fixed Qdrant API, merged ports, added AITools, Dashboard, Timer, Analytics |
| 2026-06-15 | Wired real backend to AITools, fixed all 5 API mismatches, PDF delete, Markdown summary |
| 2026-06-18 | Removed Library; Calendar: persistence, conflict detection, delete, multi-hour |
| 2026-07-01 | Removed Lectures tabs; added per-subject ResourcesPanel + backend auto-indexing |
| 2026-07-07 | UI polish (removed dead buttons); Calendar→Subject session sync; Dashboard live data |
| 2026-08-12 | Live Analytics page, 24h calendar, removed Quick Practice workflow |
