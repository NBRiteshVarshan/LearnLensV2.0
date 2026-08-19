import React, { useState, useEffect } from "react";

import { AuthProvider, useAuth } from "./auth/useAuth.jsx";
import { AuthScreen } from "./auth/AuthScreen.jsx";

import { useAppData } from "./learnlens/data.js";
import { Sidebar, TopBar, CommandBar, Ic, SUBJECT_ICONS, CUSTOM_COLORS, getCustomColorVars, WORKFLOWS } from "./learnlens/Shell.jsx";
import { Dashboard } from "./learnlens/Dashboard.jsx";
import { SubjectRouter } from "./learnlens/Workspaces.jsx";
import { Calendar_View, Analytics } from "./learnlens/Views.jsx";
import { AITools } from "./learnlens/AITools.jsx";
import { TimerProvider, TimerPill, TimerPanel } from "./learnlens/StudyTimer.jsx";
import { AnalyticsProvider } from "./learnlens/useStudyAnalytics.jsx";
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

const CUSTOM_ICON_OPTIONS = [
  "Note", "Books", "Globe", "Code", "Beaker", "Atom",
  "Sigma", "Cell", "Quill", "Video", "Chart", "Sparkle",
];

function generateId() {
  return "custom_" + Math.random().toString(36).slice(2, 9);
}

const LS_SUBJECTS_KEY = "ll-user-subjects-v1";

function loadSavedSubjects() {
  try { return JSON.parse(localStorage.getItem(LS_SUBJECTS_KEY)) || []; } catch { return []; }
}

function blankSubject(template) {
  return {
    ...template,
    key: template.id,
    type: template.type || "starter",
    color: template.color || null,
    icon: template.icon || null,
    description: template.description || null,
    createdAt: template.createdAt || null,
    instructor: "—",
    progress: 0, streak: 0, hours: 0,
    tag: template.tag || "Core",
    session: "Not scheduled",
    next: { kind: "Add first task", title: "Get started", due: "—", urgency: "neutral" },
    units: 0, unitDone: 0, resourceCount: 0, pinned: [],
  };
}

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const jumpBtn = {
  padding: "6px 10px", border: "1px solid var(--line)", borderRadius: 6,
  fontSize: 12, background: "var(--surface)", color: "var(--ink-2)", cursor: "pointer",
};

// ── Loading screen shown while /api/auth/me resolves ──────────────────────────
function AuthLoading() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: "var(--ink)",
        display: "grid",
        placeItems: "center",
        color: "var(--bg)",
        fontFamily: "var(--font-serif)",
        fontWeight: 600,
        fontSize: 24,
        animation: "ll-pulse-soft 1.8s ease-in-out infinite",
      }}>
        L
      </div>
    </div>
  );
}

// ── Main application (rendered only when authenticated) ───────────────────────
function AppContent() {
  const auth = useAuth();
  const [route, setRoute] = useState({ view: "dashboard" });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [addSubjOpen, setAddSubjOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [userSubjects, setUserSubjects] = useState(loadSavedSubjects);
  const [, forceTick] = useState(0);

  useEffect(() => {
    window.__LL_DEMO = !!t.demo;
    window.__LL_USER_SUBJECTS = userSubjects;
    forceTick(x => x + 1);
    try { localStorage.setItem(LS_SUBJECTS_KEY, JSON.stringify(userSubjects)); } catch {}
  }, [t.demo, userSubjects]);

  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
    const a = ACCENTS[t.accent] || ACCENTS["#5b6cd9"];
    const dark = t.theme === "dark";
    document.documentElement.style.setProperty("--accent",      dark ? a.d      : a.l);
    document.documentElement.style.setProperty("--accent-soft", dark ? a.soft_d : a.soft_l);
    document.documentElement.style.setProperty("--accent-line", dark ? a.line_d : a.line_l);
  }, [t.theme, t.density, t.accent]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") { setCmdOpen(false); setAddSubjOpen(false); setTimerOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const data = useAppData();
  const subjects = data.subjects;

  // Merge real user name into the display user object
  const displayUser = auth.user
    ? { ...(data.user || {}), name: auth.user.name, initials: getInitials(auth.user.name) }
    : data.user;

  const crumbs = (() => {
    if (route.view === "dashboard") return [{ label: "Today",     icon: Ic.Home }];
    if (route.view === "calendar")  return [{ label: "Calendar",  icon: Ic.Cal }];
    if (route.view === "analytics") return [{ label: "Analytics", icon: Ic.Chart }];
    if (route.view === "subject") {
      const s = subjects.find(x => x.id === route.id);
      if (!s) return [{ label: "Subjects", icon: Ic.Books }];
      const SI = SUBJECT_ICONS[s.id];
      const CI = !SI && s.icon ? Ic[s.icon] : null;
      const iconColor = SI ? `var(--${s.id})` : (() => {
        const vars = getCustomColorVars(s.color);
        return vars["--s"];
      })();
      return [
        { label: "Subjects", icon: Ic.Books },
        { label: s.name, icon: SI || CI || undefined, color: iconColor },
      ];
    }
    return [];
  })();

  const right = (
    <TimerPill
      onOpen={() => setTimerOpen(true)}
      workflow={t.workflow}
      showWorkflow={t.showWorkflowChrome}
    />
  );

  const openAddSubject = () => setAddSubjOpen(true);

  const addSubject = (template) => {
    setUserSubjects((s) => {
      if (s.find((x) => x.id === template.id)) return s;
      return [...s, blankSubject(template)];
    });
    setAddSubjOpen(false);
    setRoute({ view: "subject", id: template.id });
  };

  const deleteSubject = (id) => {
    setUserSubjects((s) => s.filter((x) => x.id !== id));
    if (route.view === "subject" && route.id === id) {
      setRoute({ view: "dashboard" });
    }
  };

  let body = null;
  if (route.view === "dashboard")  body = <Dashboard setRoute={setRoute} workflow={t.workflow} onAddSubject={openAddSubject} />;
  else if (route.view === "subject")
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
        <SubjectRouter id={route.id} />
        <div style={{ margin: "0 24px", borderTop: "1px solid var(--line)", paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 18, height: 18, color: "var(--accent)" }}><Ic.Bot /></span>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>AI Study Tools</div>
          </div>
          <AITools subjectId={route.id} />
        </div>
      </div>
    );
  else if (route.view === "calendar")  body = <Calendar_View />;
  else if (route.view === "analytics") body = <Analytics />;

  return (
    <TimerProvider>
    <AnalyticsProvider>
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        route={route}
        setRoute={setRoute}
        subjects={subjects}
        workflow={t.workflow}
        setWorkflow={(w) => setTweak("workflow", w)}
        user={displayUser}
        onAddSubject={openAddSubject}
        onLogout={auth.logout}
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

      <AddSubjectModal
        open={addSubjOpen}
        onClose={() => setAddSubjOpen(false)}
        existing={userSubjects}
        onAdd={addSubject}
        onDelete={deleteSubject}
      />

      <TimerPanel open={timerOpen} onClose={() => setTimerOpen(false)} />

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
            ]} />
          <TweakToggle label="Show workflow chrome" value={t.showWorkflowChrome}
            onChange={v => setTweak("showWorkflowChrome", v)} />
        </TweakSection>
        <TweakSection label="Jump to">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "4px 0" }}>
            <button onClick={() => setRoute({ view: "dashboard" })} style={jumpBtn}>Today</button>
            <button onClick={() => setRoute({ view: "calendar" })}  style={jumpBtn}>Calendar</button>
            <button onClick={() => setRoute({ view: "analytics" })} style={jumpBtn}>Analytics</button>
          </div>
        </TweakSection>
      </TweaksPanel>
    </div>
    </AnalyticsProvider>
    </TimerProvider>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const auth = useAuth();

  if (auth.status === "loading") return <AuthLoading />;
  if (auth.status !== "authenticated") {
    return <AuthScreen onAuth={auth.login} msg={auth._expiredMsg} />;
  }
  return <AppContent />;
}

// ── Add Subject modal ──────────────────────────────────────────────────────────
const CUSTOM_TAG_OPTIONS = ["Core", "Elective", "Lab", "Seminar", "Independent", "Language", "Other"];

function AddSubjectModal({ open, onClose, existing, onAdd, onDelete }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    icon: "Note",
    color: "indigo",
    tag: "Core",
  });

  const [nameErr, setNameErr] = useState(false);

  const resetAndClose = () => {
    setForm({ name: "", code: "", description: "", icon: "Note", color: "indigo", tag: "Core" });
    setNameErr(false);
    onClose();
  };

  const submitCustom = () => {
    if (!form.name.trim()) {
      setNameErr(true);
      return;
    }
    const id = generateId();
    onAdd({
      id,
      name: form.name.trim(),
      code: form.code.trim() || null,
      title: form.description.trim() || form.name.trim(),
      description: form.description.trim() || null,
      icon: form.icon,
      color: form.color,
      tag: form.tag,
      type: "custom",
      createdAt: new Date().toISOString(),
      flavor: "generic",
    });
  };

  if (!open) return null;

  const colorKeys = Object.keys(CUSTOM_COLORS);

  const colorSwatchStyle = (key, selected) => {
    const c = CUSTOM_COLORS[key];
    const dark = document.documentElement.dataset.theme === "dark";
    const main = dark ? c.d : c.l;
    return {
      width: 24, height: 24, borderRadius: "50%",
      background: main, cursor: "pointer", flexShrink: 0,
      outline: selected ? `2px solid ${main}` : "none",
      outlineOffset: 2,
      boxShadow: selected ? "0 0 0 1px var(--surface)" : "none",
      transition: "outline 100ms",
    };
  };

  return (
    <div
      onClick={resetAndClose}
      style={{
        position: "fixed", inset: 0,
        background: "color-mix(in oklch, var(--bg) 60%, black 40%)",
        backdropFilter: "blur(4px)", zIndex: 100,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "10vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)",
          overflow: "hidden", animation: "ll-fade-in 160ms ease",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="label-xs">New subject</div>
            <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Create a custom subject</div>
          </div>
          <button onClick={resetAndClose} style={{ width: 28, height: 28, color: "var(--ink-3)", display: "grid", placeItems: "center", borderRadius: 4 }}>
            <span style={{ width: 14, height: 14 }}><Ic.X /></span>
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Name + Code */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label-xs">Subject name *</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameErr(false); }}
                onKeyDown={(e) => e.key === "Enter" && submitCustom()}
                placeholder="e.g. Cognitive Science"
                style={{ padding: "9px 11px", border: `1px solid ${nameErr ? "var(--due)" : "var(--line)"}`, borderRadius: "var(--r)", fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label-xs">Course code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. PSYC 210"
                style={{ width: 120, padding: "9px 11px", border: "1px solid var(--line)", borderRadius: "var(--r)", fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label-xs">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Memory, cognition, decision making"
              style={{ padding: "9px 11px", border: "1px solid var(--line)", borderRadius: "var(--r)", fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)" }}
            />
          </div>

          {/* Icon Picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label-xs">Icon</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CUSTOM_ICON_OPTIONS.map((key) => {
                const I = Ic[key];
                const sel = form.icon === key;
                return (
                  <button key={key} onClick={() => setForm((f) => ({ ...f, icon: key }))}
                    style={{ width: 36, height: 36, borderRadius: "var(--r)", border: `1px solid ${sel ? "var(--accent-line)" : "var(--line)"}`, background: sel ? "var(--accent-soft)" : "var(--surface)", color: sel ? "var(--accent)" : "var(--ink-3)", display: "grid", placeItems: "center" }}>
                    <span style={{ width: 17, height: 17 }}>{I && <I />}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label-xs">Color</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {colorKeys.map((key) => (
                <button key={key} title={key} onClick={() => setForm((f) => ({ ...f, color: key }))} style={colorSwatchStyle(key, form.color === key)} />
              ))}
            </div>
          </div>

          {/* Category */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="label-xs">Category</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CUSTOM_TAG_OPTIONS.map((tag) => (
                <button key={tag} onClick={() => setForm((f) => ({ ...f, tag }))}
                  style={{ padding: "5px 12px", borderRadius: 100, border: `1px solid ${form.tag === tag ? "var(--accent-line)" : "var(--line)"}`, background: form.tag === tag ? "var(--accent-soft)" : "var(--surface)", color: form.tag === tag ? "var(--accent)" : "var(--ink-3)", fontSize: "var(--fs-13)", cursor: "pointer" }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Existing Subjects */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            <label className="label-xs">Your Subjects</label>
            {existing.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--ink-3)", padding: "10px 0" }}>No custom subjects created yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto", paddingRight: 4 }}>
                {existing.map((subj) => {
                  const IconComp = Ic[subj.icon] || Ic.Note;
                  return (
                    <div key={subj.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--line)", borderRadius: "var(--r)", padding: "10px 12px", background: "var(--surface-2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
                          <span style={{ width: 15, height: 15 }}><IconComp /></span>
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{subj.name}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{subj.tag || "Custom"}</div>
                        </div>
                      </div>
                      <button onClick={() => onDelete(subj.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--due)", fontSize: 12, cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Your subject workspace will be created instantly.</div>
            <button onClick={submitCustom} style={{ padding: "8px 16px", borderRadius: "var(--r)", fontSize: "var(--fs-13)", background: "var(--accent)", color: "var(--on-accent)", fontWeight: 500 }}>
              Create subject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
