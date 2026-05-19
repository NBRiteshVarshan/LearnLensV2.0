# LearnLens — design integration

A complete academic-OS shell that wraps your existing LearnLens V2.0 AI tools. **Nothing in your FastAPI backend changes.** All four current features (Upload, Ask AI, Summary, Quiz) keep working exactly as they do today, accessible from the new sidebar under **AI Tools**.

## File map

```
frontend/
├── src/
│   ├── App.jsx                ← REPLACES yours (new shell + routes to LegacyApp)
│   ├── main.jsx               ← REPLACES yours (now imports tokens.css)
│   ├── styles/
│   │   └── tokens.css         ← NEW — design tokens (light + dark + per-subject)
│   └── learnlens/             ← NEW
│       ├── data.js              mock content (subjects, tasks, calendar, etc.)
│       ├── Shell.jsx            sidebar, top bar, command palette, primitives
│       ├── Dashboard.jsx        "Today" view
│       ├── Workspaces.jsx       Math · Programming · Biology · Literature workspaces
│       ├── Views.jsx            Library · Calendar · Analytics · Inbox
│       ├── TweaksPanel.jsx      floating panel (theme/density/accent/workflow)
│       └── LegacyApp.jsx        ← your old App.jsx, preserved end-to-end
```

`LegacyApp.jsx` is your original `App.jsx` with two surgical patches:
- Its CSS variables are scoped to `.ll-legacy` (so the old purple tokens don't
  override the new design system globally).
- It accepts `embedded`, `activeTab`, `setActiveTab` props so the new shell can
  drive its sub-tabs externally. Standalone use still works
  (`<LegacyApp />` with no props).

Your `package.json`, `vite.config.js`, `index.html`, and the entire backend tree are untouched.

## Install

```bash
cd LearnLensV2.0/frontend
# back up your old App.jsx just in case
cp src/App.jsx src/App.jsx.bak

# copy this bundle in (files only — preserves your config + public/)
cp -R <unzipped>/frontend/src/ src/

# no new deps to install
npm run dev
```

Open the dev URL. You should see the new dashboard. Click **AI Tools** in the
left rail to access your existing Upload / Ask AI / Summary / Quiz flows, which
still call your FastAPI backend at `http://localhost:8000` unmodified.

## What's preserved

Every API call in your old codebase still runs against the same backend:

```js
import {
  apiFetch, uploadPDF, ingestPDF,
  askQuestion, generateSummary, generateQuiz, listPDFs,
} from "./learnlens/LegacyApp.jsx";
```

These are named exports off `LegacyApp.jsx` so any future workspace can call
them directly — e.g. wire `askQuestion` into the math workspace's "ask about
this theorem" action, or hook `generateQuiz` into the practice tab.

## Customisation

The bottom-right ⚙ button opens **Tweaks**:

- **Theme** — Day / Night (paper ivory ↔ graphite slate)
- **Density** — Compact / Cozy / Comfort
- **System accent** — Indigo / Sage / Rust / Slate (OKLCH)
- **Workflow mode** — Deep study / Revision / Exam prep / Quick practice
  (shown as a contextual chip in the top bar)

State persists to `localStorage` under the key `learnlens.tweaks`.

## Notes

- **React 19** — uses `createRoot`, no class components, no `findDOMNode`.
- **No new dependencies** — vanilla React + inline styles + tokens.css.
- The mock data in `data.js` powers the dashboard / calendar / library views.
  Swap in real backend calls when you're ready; the file is small and clean.
- Subject workspace flavors (math / programming / biology / literature) are
  routed inside `Workspaces.jsx::SubjectRouter`. Other subjects (physics,
  chemistry, history) fall through to a placeholder ready for you to design.
