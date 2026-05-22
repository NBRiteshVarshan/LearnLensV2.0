# LearnLens v2 — Project Context

> Read this file at the start of every session. It contains enough context to work
> productively without scanning the codebase from scratch.

---

## What this project is

An academic learning OS — a single-page React app that combines subject workspaces,
an AI study assistant (RAG over uploaded PDFs), a study timer, calendar, library,
analytics, and an inbox. Think Google Classroom + Notion + Pomodoro timer.

Live at `http://localhost:5173` (dev) or `http://localhost:8000` (prod build served by FastAPI).

---

## Actual tech stack

| Layer      | Technology |
|------------|-----------|
| Frontend   | React 19 + Vite 8 — plain JSX, **no TypeScript** |
| Styling    | Pure CSS custom properties (CSS variables in `tokens.css`) — **no Tailwind** |
| State      | React `useState` / `useEffect` / `useContext` — **no Zustand** |
| Animations | CSS `@keyframes` + inline `transition` — **no Framer Motion** |
| Backend    | FastAPI + Uvicorn (Python) |
| Vector DB  | Qdrant (local file-based, `backend/qdrant_data/`) |
| Embeddings | `all-MiniLM-L6-v2` via `sentence-transformers` |
| LLM        | Groq API — `llama-3.3-70b-versatile` |
| Build      | Vite; `npm run build` → `frontend/dist/`, served by FastAPI at `/` |

**Important:** Future prompts may mention Next.js / TypeScript / Tailwind / shadcn /
Framer Motion / Zustand. None of those are in this repo. Always implement in the
actual stack above.

---

## How to run

```bash
# Terminal 1 — backend (port 8000)
cd backend
py -3 -m uvicorn main:app --reload --port 8000

# Terminal 2 — frontend dev server (port 5173, proxies /api → 8000)
cd frontend
npm run dev
```

Requires `backend/.env` with `GROQ_API_KEY=...`.

---

## Directory structure

```
LearnLensV2.0/
├── backend/
│   ├── main.py                  ← FastAPI app (all routes, RAG logic)
│   ├── requirements.txt         ← pinned Python deps
│   └── qdrant_data/             ← local vector DB (binary, committed)
└── frontend/
    └── src/
        ├── App.jsx              ← root component, routing, global state
        ├── styles/
        │   └── tokens.css       ← entire design system (CSS vars + keyframes)
        └── learnlens/
            ├── Shell.jsx        ← Sidebar, TopBar, CommandBar, all shared UI primitives
            ├── Dashboard.jsx    ← Today view (EmptyDashboard + LiveDashboard)
            ├── Workspaces.jsx   ← per-subject workspace router + 6 subject views
            ├── Views.jsx        ← Library, Calendar, Analytics, Inbox views
            ├── AITools.jsx      ← Upload / Ask AI / Summarise / Quiz tabs
            ├── TweaksPanel.jsx  ← side-panel settings drawer + useTweaks hook
            ├── data.js          ← useAppData() hook + all demo/empty data
            ├── useStudyTimer.js ← timer logic hook (timestamp-based, localStorage)
            └── StudyTimer.jsx   ← TimerProvider, useTimer, TimerPill, TimerPanel
```

---

## Routing model

All routing is a single React state object in `App.jsx`:

```js
const [route, setRoute] = useState({ view: "dashboard" });
// views: "dashboard" | "subject" | "library" | "calendar" | "analytics" | "inbox" | "aitools"
// subject view also has: route.id (e.g. "math", "prog", "bio")
```

No React Router. `setRoute(...)` is prop-drilled to Sidebar and any component that needs to navigate.

---

## Design system — how to style things

All colours, spacing, typography are **CSS custom properties** defined in `tokens.css`.
Never hardcode colour values. Key variables:

```css
--bg, --surface, --surface-2, --surface-3   /* backgrounds, layered */
--line, --line-soft, --line-strong           /* borders */
--ink, --ink-2, --ink-3, --ink-4             /* text, descending prominence */
--accent, --accent-soft, --accent-line       /* primary brand colour (indigo) */
--ok / --ok-soft                             /* green — success, streak */
--warn / --warn-soft                         /* amber — caution */
--due / --due-soft                           /* orange-red — deadlines */
--shadow-sm, --shadow-md, --shadow-lg        /* box shadows */
--font-sans, --font-serif, --font-mono       /* IBM Plex Sans / Newsreader / JetBrains */
--fs-12 … --fs-48                            /* font sizes */
--r-xs, --r-sm, --r, --r-md, --r-lg, --r-xl /* border radii */
```

Subject colours are scoped via `data-subject` attribute:
```jsx
<div data-subject="math">  // → exposes --s, --s-soft, --s-line CSS vars
```

Shared UI primitives (all in `Shell.jsx`, already exported):
- `<Card>` — surface box with border + shadow
- `<Pill tone="ok|warn|due|accent|subject">` — inline badge
- `<Btn variant="default|primary|accent|ghost" icon={Ic.X}>` — button
- `<SectionTitle kicker="..." title="..." action={...} />`
- `Ic.*` — all SVG icons (inline, no icon library)

CSS utility classes: `.mono`, `.serif`, `.tabular`, `.label-xs`, `.muted`, `.dim`

Keyframe animations defined in `tokens.css`:
- `ll-fade-in` — entrance slide-up + fade
- `ll-pulse-soft` — slow dot/indicator pulse
- `ll-panel-in` — modal entrance (scale + fade)
- `ll-breathe` — subtle opacity breathe (timer running)
- `ll-breathe-glow` — radial glow expand/contract
- `ll-completion-flash` — full-panel flash on timer done
- `ll-glow-pulse` — box-shadow pulse (timer pill on completion)

---

## Data layer — `useAppData()` and demo mode

`data.js` exports a `useAppData()` hook. All components consume data through it.

```js
const d = useAppData();
// d.subjects, d.todayTasks, d.activity, d.aiActivity, d.weekFocus,
// d.friends, d.inbox, d.libItems, d.calEvents, d.user, d.demo
```

The hook reads `window.__LL_DEMO` (a global boolean set by `App.jsx`):
- `true` → returns full pre-populated demo dataset (6 subjects, tasks, AI activity, etc.)
- `false` → returns empty arrays + `window.__LL_USER_SUBJECTS` for user-added subjects

`App.jsx` syncs the demo toggle (from TweaksPanel) to `window.__LL_DEMO` via a
`useEffect`. A `forceTick` dummy state causes all `useAppData()` callers to re-read.

User-added subjects live in `App.jsx`'s `userSubjects` state (not localStorage yet).
`blankSubject(template)` creates a zeroed-out subject from a `SUBJECT_TEMPLATES` entry.

---

## Study Timer system

### Files
- `useStudyTimer.js` — pure logic hook, no JSX
- `StudyTimer.jsx` — context + `TimerPill` + `TimerPanel` + `ProgressRing`

### Architecture
```
TimerProvider (wraps entire App)
  ↓ context
  TimerPill (top bar)    — reads status/displaySecs
  TimerPanel (modal)     — reads all, calls actions
  FocusSessionCard       — reads status/progress/displaySecs
  LiveAICell             — reads status/sessionCount
```

### Timer state (in `useStudyTimer.js`)
```js
{
  mode: "study" | "short" | "long",
  status: "idle" | "running" | "paused" | "completed",
  startedAt: null | timestamp,   // Date.now() when last started
  snapSecs: number,              // seconds remaining at last start/pause
  sessionCount: number,
  totalFocusSecs: number,
}
```

### Accuracy mechanism
Remaining time is computed as `snapSecs - (Date.now() - startedAt) / 1000`.
This is recalculated fresh on every RAF tick — no accumulated drift, survives
tab switches and system sleep. On page reload, the same formula is applied to
the localStorage-persisted `startedAt` to determine if the timer expired while
the tab was closed.

### Persistence
Full state serialised to `localStorage` key `"ll-timer-v1"` on every `setS()` call.

### Modes (seconds)
```js
study: 25 * 60,  short: 5 * 60,  long: 15 * 60
```

### Keyboard shortcuts (active only when TimerPanel is open)
`Space` pause/resume · `R` reset · `S` start · `Esc` close

### Audio
Web Audio API, no files. Three sine waves (C5 → E5 → G5) for session complete,
single A4 for break end. Generated inline in `StudyTimer.jsx → playDoneSound()`.

---

## Backend — `backend/main.py`

Single FastAPI file. Key architecture points:

- All API routes are on an `APIRouter`, mounted at `/api` prefix.
- Frontend build (`frontend/dist/`) is served as static files from the same port 8000.
- SPA catch-all: any non-`/api` path returns `index.html`.
- `QdrantClient` and `SentenceTransformer` are initialised inside the FastAPI
  `lifespan` handler (not at module level) to avoid double-open crash on `--reload`.
- Stale `.lock` file is auto-deleted on startup.
- Windows UTF-8 fix: `sys.stdout.reconfigure(encoding="utf-8")` before any imports.

### API endpoints (all under `/api`)
```
GET  /health          ← connectivity check
POST /upload          ← receive PDF, store metadata in memory
POST /ingest          ← chunk + embed + upsert into Qdrant
POST /ask             ← RAG Q&A (Groq + Qdrant)
POST /summary         ← summarise selected PDFs (Groq)
POST /quiz            ← generate 10-Q MCQ (Groq)
POST /extract-text    ← raw text extraction from PDF
GET  /pdfs            ← list indexed PDFs
DELETE /pdf/{id}      ← remove PDF + vectors
```

In-memory PDF store (`pdf_store` dict) resets on server restart — no database
persistence for upload metadata yet. Vector embeddings survive in `qdrant_data/`.

### Qdrant search (v1.10+ API)
```python
results = qdrant.query_points(
    collection_name=COLLECTION_NAME,
    query=query_embedding,          # not query_vector=
    query_filter=Filter(...),       # not scroll_filter=
    limit=6
).points                            # .points needed on QueryResponse
```

---

## Key patterns and conventions

### Inline styles — always, no CSS modules
Every component uses `style={{ ... }}` with CSS variable references.
No external CSS files per component. No class names except `.mono`, `.tabular`,
`.label-xs`, `.serif`, `.label-xs` from `tokens.css`.

### Event handlers — inline hover state
Since there's no Tailwind `hover:`, hover states use `onMouseEnter`/`onMouseLeave`
to set `e.currentTarget.style.*`. Pattern:
```jsx
onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
onMouseLeave={e => e.currentTarget.style.background = "transparent"}
```

### No comments in component logic
Code is self-documenting via naming. Only architectural WHY comments (not WHAT).

### Subject color scoping
Wrap any element that needs subject-specific color in `data-subject={s.id}`.
Then use `var(--s)`, `var(--s-soft)`, `var(--s-line)` as the subject's accent.

### Modal pattern (AddSubjectModal, TimerPanel, CommandBar)
All use `position: fixed, inset: 0` backdrop with `onClick={onClose}` + 
`e.stopPropagation()` on the inner card. `backdropFilter: blur(...)`. `zIndex: 200+`.
Entrance animation via `ll-fade-in` or `ll-panel-in`.

---

## Global state in App.jsx

```js
const [route,          setRoute]         = useState({ view: "dashboard" });
const [cmdOpen,        setCmdOpen]       = useState(false);
const [addSubjOpen,    setAddSubjOpen]   = useState(false);
const [timerOpen,      setTimerOpen]     = useState(false);
const [t,              setTweak]         = useTweaks(TWEAK_DEFAULTS);
const [userSubjects,   setUserSubjects]  = useState(loadSavedSubjects);  // persisted to localStorage
const [,               forceTick]        = useState(0);   // forces re-render for useAppData()
```

`t` (tweaks) shape:
```js
{ theme: "light|dark", workflow: "study|rev|exam|quick",
  density: "compact|cozy|comfortable", accent: "#hex",
  showWorkflowChrome: bool, demo: bool }
```

Tweaks are persisted to `localStorage` via `useTweaks()` in `TweaksPanel.jsx`.

---

## Subject workspace views (Workspaces.jsx)

`<SubjectRouter id={route.id} />` switches on subject ID to render a subject-specific
workspace. Each subject type has a distinct view flavour:

| id    | flavor  | Key UI |
|-------|---------|--------|
| math  | formula | Problem set tracker + theorem cards |
| prog  | code    | IDE-style file tree + terminal output |
| bio   | diagram | Annotated diagram grid + glossary |
| lit   | reading | Passage reader + annotation sidebar |
| phys  | formula | Same as math |
| chem  | diagram | Same as bio |
| hist  | reading | Same as lit |

---

## Recent significant changes (append here as work progresses)

### Session — 2026-05-22
- Fixed Qdrant `search()` → `query_points()` (API removed in v1.10+)
- Fixed Qdrant double-lock crash by moving init into FastAPI `lifespan` handler
- Fixed Windows UTF-8 crash on startup
- Merged frontend + backend onto single port 8000 (all API routes under `/api`)
- Added `requirements.txt` with pinned versions
- Replaced `LegacyApp` with new `AITools.jsx` (Upload/Ask/Summarise/Quiz)
- Rewrote `Dashboard.jsx` with live clock, empty onboarding state, real-time AI feed,
  and focus timer card
- Added `useAppData()` data hook + demo mode toggle (window.__LL_DEMO global)
- Added "Add Subject" modal with 7 starter templates
- **Implemented Deep Study Timer system:**
  - `useStudyTimer.js` — timestamp-based hook, localStorage persistence, RAF display
  - `StudyTimer.jsx` — TimerProvider context, TimerPill, TimerPanel, ProgressRing
  - `TimerPanel` has 3 modes (25/5/15 min), all states, sound, notifications, shortcuts
  - Wired `FocusSessionCard` + `LiveAICell` in Dashboard to shared timer context
  - Added 5 CSS keyframe animations to `tokens.css`
- **Implemented custom subject creation:**
  - Added `CUSTOM_COLORS` palette (7 colors: indigo/emerald/amber/violet/rose/cyan/slate) and `getCustomColorVars(colorKey)` helper to `Shell.jsx` — reads live theme from DOM, returns `{--s, --s-soft, --s-line}` inline style vars
  - Extended `AddSubjectModal` in `App.jsx` with two-view flow: template gallery + custom creation form (name, code, description, icon picker, color swatcher, category tag)
  - Custom subjects get generated IDs (`custom_<random>`), `type: "custom"`, `color`, `icon`, `createdAt` fields
  - `userSubjects` now persists to `localStorage` (key `ll-user-subjects-v1`), loaded on init
  - `SubjectItem` in `Shell.jsx` renders custom icons from `Ic[s.icon]` or initials fallback, applies inline color vars
  - `SubjectHeader` in `Workspaces.jsx` handles same fallback pattern
  - `GenericSubject` replaced placeholder with a working notes tab + empty states for other tabs
  - Breadcrumbs in `App.jsx` resolve correct color for custom subjects using `getCustomColorVars`
  - `blankSubject()` extended with `type`, `color`, `icon`, `description`, `createdAt` fields
- **Implemented real-time analytics engine (`useStudyAnalytics.jsx`):**
  - `AnalyticsProvider` wraps app inside `TimerProvider`; `useAnalytics()` hook for any consumer
  - `emitAIActivity({ type, label, subj, status })` — fire-and-forget, uses CustomEvent on `window`; callable without context access
  - `TimerWatcher` null-component bridges timer context → analytics: detects `running→completed` transition, records 25-min session, emits FOCUS event
  - Three localStorage keys: `ll-analytics-sessions-v1`, `ll-analytics-recall-v1`, `ll-analytics-ai-v1`
  - **Focus this week**: filters sessions by ISO week Mon–Sun, computes total + prev-week delta % + per-day sparkline array
  - **Streak**: walks backward from today; if today < 20 min threshold, starts from yesterday (preserves overnight streak)
  - **Longest streak**: O(n) pass over sorted study days
  - **Recall avg (7d)**: rolling mean over quiz events; trend compares first-half vs second-half of recent events
  - AI events: last 30 events persisted; `latestAI` = most recent event; `isRecentAI` = within 15 seconds (drives `LiveAICell` headline)
  - Dashboard `StatCell` grid — all 4 metrics now live (Focus, Streak, Recall, Coming Due)
  - `LiveAICell` — shows most recent AI event for 15s, falls back to timer-aware messages; amber gradient when AI is processing
  - `RealtimeAnalysisCard` — demo mode shows existing formatted demo events; real mode shows analytics events with pulse indicator on active row; empty state with instructions
  - `EmptyDashboard` preview — all 4 stats show real analytics values (no more hard-coded "—")
  - `SubjectCard` in `Dashboard.jsx` — fixed for custom subjects (color vars + icon fallback)
  - `AITools.jsx` — wired `emitAIActivity` at upload, embed, ask, summary, quiz generate; `QuizPanel` detects full completion and calls `recordQuizResult` → updates recall avg
- **Implemented collapsible sidebar (`Shell.jsx`):**
  - Two states: `collapsed` (bool, drives `<aside>` width 64px vs `var(--rail-w)`) + `showLabels` (bool, drives content rendering)
  - `toggleCollapse()`: on collapse → hide labels immediately then shrink; on expand → grow width then show labels after 220ms (smooth sequencing without Framer Motion)
  - `<aside>` gets `transition: "width 240ms cubic-bezier(0.4,0,0.2,1)"` + `overflow: "hidden"` to clip text during animation
  - All nav items, subject items center their icon when collapsed; `title` attribute provides tooltip on hover
  - Subjects list always shows icon-only rows when collapsed even if `openSubjects` is false (so sidebar stays useful)
  - `WorkflowSwitch`: shows full list when expanded; single `--accent` dot with `title` tooltip when collapsed
  - `ProfileWidget`: shows compact 36px avatar ring when collapsed; full widget with expanded popup when expanded
  - Profile popup changed from `position: absolute` to `position: fixed` (using `getBoundingClientRect` ref) so it escapes `overflow: hidden` on the aside
  - State persisted to `localStorage` key `ll-sidebar-collapsed`
