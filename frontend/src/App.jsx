import React, { useState, useEffect } from "react";

import { useAppData } from "./learnlens/data.js";
import { Sidebar, TopBar, CommandBar, Ic, SUBJECT_ICONS, WORKFLOWS } from "./learnlens/Shell.jsx";
import { Dashboard } from "./learnlens/Dashboard.jsx";
import { SubjectRouter } from "./learnlens/Workspaces.jsx";
import { Library, Calendar_View, Analytics, Inbox } from "./learnlens/Views.jsx";
import { AITools } from "./learnlens/AITools.jsx";
import {
  TweaksPanel, useTweaks, TweakSection,
  TweakRadio, TweakSelect, TweakToggle, TweakColor,
} from "./learnlens/TweaksPanel.jsx";

const TWEAK_DEFAULTS = {
  theme: "light",
  workflow: "study",
  density: "cozy",
  accent: "#5b6cd9",
  showWorkflowChrome: true,
  demo: false,
};

const ACCENTS = {
  "#5b6cd9": { l: "oklch(48% 0.13 265)", d: "oklch(72% 0.10 235)", soft_l: "oklch(94% 0.04 265)", soft_d: "oklch(28% 0.05 235)", line_l: "oklch(80% 0.08 265)", line_d: "oklch(40% 0.07 235)" },
  "#5b9472": { l: "oklch(48% 0.10 150)", d: "oklch(74% 0.09 155)", soft_l: "oklch(94% 0.03 150)", soft_d: "oklch(26% 0.04 155)", line_l: "oklch(80% 0.06 150)", line_d: "oklch(38% 0.06 155)" },
  "#b66e3b": { l: "oklch(50% 0.13 35)",  d: "oklch(74% 0.10 35)",  soft_l: "oklch(95% 0.03 35)",  soft_d: "oklch(28% 0.05 35)",  line_l: "oklch(82% 0.06 35)",  line_d: "oklch(38% 0.07 35)" },
  "#56616e": { l: "oklch(40% 0.04 260)", d: "oklch(78% 0.02 260)", soft_l: "oklch(94% 0.01 260)", soft_d: "oklch(26% 0.01 260)", line_l: "oklch(80% 0.02 260)", line_d: "oklch(38% 0.02 260)" },
};

const SUBJECT_TEMPLATES = [
  { id: "math", name: "Mathematics",   code: "MATH 241", title: "Real Analysis & Linear Algebra",  flavor: "formula" },
  { id: "prog", name: "Programming",   code: "CS 168",   title: "Algorithms & Data Structures",    flavor: "code" },
  { id: "bio",  name: "Biology",       code: "BIO 220",  title: "Cellular & Molecular Biology",    flavor: "diagram" },
  { id: "lit",  name: "Literature",    code: "ENG 340",  title: "20th-c. European Modernism",      flavor: "reading" },
  { id: "phys", name: "Physics",       code: "PHYS 211", title: "Classical Mechanics",             flavor: "formula" },
  { id: "chem", name: "Chemistry",     code: "CHEM 130", title: "Organic Chemistry I",             flavor: "diagram" },
  { id: "hist", name: "History",       code: "HIST 105", title: "20th Century History",            flavor: "reading" },
];

function blankSubject(template) {
  return {
    ...template, key: template.id, instructor: "—",
    progress: 0, streak: 0, hours: 0, tag: "Core", session: "Not scheduled",
    next: { kind: "Add first task", title: "Get started", due: "—", urgency: "neutral" },
    units: 0, unitDone: 0, resourceCount: 0, pinned: [],
  };
}

const jumpBtn = {
  padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6,
  fontSize: 12, background: "var(--surface)", color: "var(--ink-2)", cursor: "pointer",
};

export default function App() {
  const [route, setRoute] = useState({ view: "dashboard" });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [addSubjOpen, setAddSubjOpen] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [userSubjects, setUserSubjects] = useState([]);
  const [, forceTick] = useState(0);

  // Mirror demo state to window for components that use useAppData()
  useEffect(() => {
    window.__LL_DEMO = !!t.demo;
    window.__LL_USER_SUBJECTS = userSubjects;
    forceTick(x => x + 1);
  }, [t.demo, userSubjects]);

  // Apply theme / density / accent
  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
    const a = ACCENTS[t.accent] || ACCENTS["#5b6cd9"];
    const dark = t.theme === "dark";
    document.documentElement.style.setProperty("--accent",      dark ? a.d      : a.l);
    document.documentElement.style.setProperty("--accent-soft", dark ? a.soft_d : a.soft_l);
    document.documentElement.style.setProperty("--accent-line", dark ? a.line_d : a.line_l);
  }, [t.theme, t.density, t.accent]);

  // ⌘K + Escape
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") { setCmdOpen(false); setAddSubjOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const data = useAppData();
  const subjects = data.subjects;

  const crumbs = (() => {
    if (route.view === "dashboard") return [{ label: "Today",     icon: Ic.Home }];
    if (route.view === "library")   return [{ label: "Library",   icon: Ic.Books }];
    if (route.view === "calendar")  return [{ label: "Calendar",  icon: Ic.Cal }];
    if (route.view === "analytics") return [{ label: "Analytics", icon: Ic.Chart }];
    if (route.view === "inbox")     return [{ label: "Inbox",     icon: Ic.Inbox }];
    if (route.view === "aitools")   return [{ label: "AI Tools",  icon: Ic.Bot }];
    if (route.view === "subject") {
      const s = subjects.find(x => x.id === route.id);
      if (!s) return [{ label: "Subjects", icon: Ic.Books }];
      const I = SUBJECT_ICONS[s.id];
      return [
        { label: "Subjects", icon: Ic.Books },
        { label: s.name, icon: I, color: `var(--${s.id})` },
      ];
    }
    return [];
  })();

  const workflowLabel = {
    study: "Deep study", rev: "Revision", exam: "Exam prep", quick: "Quick practice",
  }[t.workflow];

  const right = t.showWorkflowChrome ? (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "5px 12px",
      borderRadius: 100, border: "1px solid var(--accent-line)",
      background: "var(--accent-soft)", color: "var(--accent)",
      fontSize: "var(--fs-13)", fontWeight: 500,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)",
        animation: "ll-pulse-soft 1.8s infinite" }} />
      {workflowLabel} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· 25:00 timer ready</span>
    </div>
  ) : null;

  const openAddSubject = () => setAddSubjOpen(true);

  const addSubject = (template) => {
    setUserSubjects(s => {
      if (s.find(x => x.id === template.id)) return s;
      return [...s, blankSubject(template)];
    });
    setAddSubjOpen(false);
    setRoute({ view: "subject", id: template.id });
  };

  let body = null;
  if (route.view === "dashboard")  body = <Dashboard setRoute={setRoute} workflow={t.workflow} onAddSubject={openAddSubject} />;
  else if (route.view === "subject")   body = <SubjectRouter id={route.id} />;
  else if (route.view === "library")   body = <Library />;
  else if (route.view === "calendar")  body = <Calendar_View />;
  else if (route.view === "analytics") body = <Analytics />;
  else if (route.view === "inbox")     body = <Inbox />;
  else if (route.view === "aitools")   body = <AITools />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        route={route}
        setRoute={setRoute}
        subjects={subjects}
        workflow={t.workflow}
        setWorkflow={(w) => setTweak("workflow", w)}
        user={data.user}
        onAddSubject={openAddSubject}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar
          crumbs={crumbs}
          right={right}
          theme={t.theme}
          setTheme={(th) => setTweak("theme", th)}
          onCmd={() => setCmdOpen(true)}
        />
        <div key={route.view + (route.id || "")} style={{ flex: 1, overflow: "auto", animation: "ll-fade-in 220ms ease" }}>
          <div style={{ minWidth: "var(--min-canvas-w)" }}>
            {body}
          </div>
        </div>
      </main>

      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} subjects={subjects} setRoute={setRoute} />

      <AddSubjectModal open={addSubjOpen} onClose={() => setAddSubjOpen(false)}
        existing={userSubjects} onAdd={addSubject} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="App state">
          <TweakToggle label="Demo data" value={t.demo}
            onChange={v => setTweak("demo", v)} />
          <div style={{ fontSize: 11, color: "var(--ink-3)", padding: "0 2px 6px", lineHeight: 1.5 }}>
            Off — empty app, you populate it. On — pre-filled with the Hilary-term demo.
          </div>
        </TweakSection>
        <TweakSection label="Appearance">
          <TweakRadio label="Theme" value={t.theme} onChange={v => setTweak("theme", v)}
            options={[{ value: "light", label: "Day" }, { value: "dark", label: "Night" }]} />
          <TweakRadio label="Density" value={t.density} onChange={v => setTweak("density", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "cozy", label: "Cozy" },
              { value: "comfortable", label: "Comfort" },
            ]} />
          <TweakColor label="System accent" value={t.accent} onChange={v => setTweak("accent", v)}
            options={["#5b6cd9", "#5b9472", "#b66e3b", "#56616e"]} />
        </TweakSection>
        <TweakSection label="Workflow">
          <TweakSelect label="Mode" value={t.workflow} onChange={v => setTweak("workflow", v)}
            options={[
              { value: "study", label: "Deep study — reading-focused" },
              { value: "rev",   label: "Revision — recall & summaries" },
              { value: "exam",  label: "Exam prep — PYQs & timers" },
              { value: "quick", label: "Quick practice — 10-min sprints" },
            ]} />
          <TweakToggle label="Show workflow chrome" value={t.showWorkflowChrome}
            onChange={v => setTweak("showWorkflowChrome", v)} />
        </TweakSection>
        <TweakSection label="Jump to">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "4px 0" }}>
            <button onClick={() => setRoute({ view: "dashboard" })} style={jumpBtn}>Today</button>
            <button onClick={() => setRoute({ view: "aitools" })}   style={jumpBtn}>AI Tools</button>
            <button onClick={() => setRoute({ view: "inbox" })}     style={jumpBtn}>Inbox</button>
            <button onClick={() => setRoute({ view: "library" })}   style={jumpBtn}>Library</button>
            <button onClick={() => setRoute({ view: "calendar" })}  style={jumpBtn}>Calendar</button>
            <button onClick={() => setRoute({ view: "analytics" })} style={jumpBtn}>Analytics</button>
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

// ── Add Subject modal ──────────────────────────────────────────────────────
function AddSubjectModal({ open, onClose, existing, onAdd }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "color-mix(in oklch, var(--bg) 60%, black 40%)",
      backdropFilter: "blur(4px)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "10vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 640, background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)", overflow: "hidden",
        animation: "ll-fade-in 160ms ease",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div className="label-xs">New subject</div>
            <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Pick a starter, or build from scratch</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, color: "var(--ink-3)", display: "grid", placeItems: "center", borderRadius: 4 }}>
            <span style={{ width: 14, height: 14 }}><Ic.X /></span>
          </button>
        </div>
        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SUBJECT_TEMPLATES.map(tpl => {
            const I = SUBJECT_ICONS[tpl.id];
            const already = existing.find(x => x.id === tpl.id);
            return (
              <button key={tpl.id} onClick={() => !already && onAdd(tpl)} data-subject={tpl.id}
                disabled={!!already}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 10,
                  border: "1px solid var(--line)", background: "var(--surface)",
                  opacity: already ? 0.5 : 1, cursor: already ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "border-color 140ms, background 140ms",
                }}
                onMouseEnter={e => !already && (e.currentTarget.style.borderColor = "var(--s-line)")}
                onMouseLeave={e => !already && (e.currentTarget.style.borderColor = "var(--line)")}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--s-soft)", color: "var(--s)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>{I && <span style={{ width: 17, height: 17 }}><I /></span>}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, marginBottom: 2 }}>
                    {tpl.name} <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginLeft: 4 }}>{tpl.code}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontStyle: "italic" }}>{tpl.title}</div>
                </div>
                {already && <span className="mono" style={{ fontSize: 10, color: "var(--ok)" }}>added</span>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--surface-2)",
          display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-3)",
        }}>
          <span>Empty subjects start with zero units, resources, and tasks — fill them up as you go.</span>
          <button onClick={onClose} style={{ fontSize: 12, color: "var(--ink-2)" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
