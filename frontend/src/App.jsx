/**
 * App shell — the LearnLens academic operating system.
 *
 * Wraps the original AI tools (Upload / Ask / Summary / Quiz) so every
 * existing feature keeps working against the FastAPI backend, while the new
 * shell adds subject workspaces, library, calendar, and analytics around it.
 */
import React, { useState, useEffect } from "react";

import { SUBJECTS } from "./learnlens/data.js";
import { Sidebar, TopBar, CommandBar, Ic, SUBJECT_ICONS } from "./learnlens/Shell.jsx";
import { Dashboard } from "./learnlens/Dashboard.jsx";
import { SubjectRouter } from "./learnlens/Workspaces.jsx";
import { Library, Calendar_View, Analytics, Inbox } from "./learnlens/Views.jsx";
import LegacyApp from "./learnlens/LegacyApp.jsx";
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
};

const ACCENTS = {
  "#5b6cd9": { l: "oklch(48% 0.13 265)", d: "oklch(72% 0.10 235)", soft_l: "oklch(94% 0.04 265)", soft_d: "oklch(28% 0.05 235)", line_l: "oklch(80% 0.08 265)", line_d: "oklch(40% 0.07 235)" },
  "#5b9472": { l: "oklch(48% 0.10 150)", d: "oklch(74% 0.09 155)", soft_l: "oklch(94% 0.03 150)", soft_d: "oklch(26% 0.04 155)", line_l: "oklch(80% 0.06 150)", line_d: "oklch(38% 0.06 155)" },
  "#b66e3b": { l: "oklch(50% 0.13 35)",  d: "oklch(74% 0.10 35)",  soft_l: "oklch(95% 0.03 35)",  soft_d: "oklch(28% 0.05 35)",  line_l: "oklch(82% 0.06 35)",  line_d: "oklch(38% 0.07 35)" },
  "#56616e": { l: "oklch(40% 0.04 260)", d: "oklch(78% 0.02 260)", soft_l: "oklch(94% 0.01 260)", soft_d: "oklch(26% 0.01 260)", line_l: "oklch(80% 0.02 260)", line_d: "oklch(38% 0.02 260)" },
};

const AI_TABS = [
  { id: "upload",  label: "Upload" },
  { id: "chat",    label: "Ask AI" },
  { id: "summary", label: "Summary" },
  { id: "quiz",    label: "Quiz" },
];

export default function App() {
  const [route, setRoute] = useState({ view: "dashboard" });
  const [aiTab, setAiTab] = useState("upload");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme / density / accent.
  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
    const a = ACCENTS[t.accent] || ACCENTS["#5b6cd9"];
    const dark = t.theme === "dark";
    document.documentElement.style.setProperty("--accent",      dark ? a.d      : a.l);
    document.documentElement.style.setProperty("--accent-soft", dark ? a.soft_d : a.soft_l);
    document.documentElement.style.setProperty("--accent-line", dark ? a.line_d : a.line_l);
  }, [t.theme, t.density, t.accent]);

  // ⌘K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = (() => {
    if (route.view === "dashboard") return [{ label: "Today", icon: Ic.Home }];
    if (route.view === "library")   return [{ label: "Library", icon: Ic.Books }];
    if (route.view === "calendar")  return [{ label: "Calendar", icon: Ic.Cal }];
    if (route.view === "analytics") return [{ label: "Analytics", icon: Ic.Chart }];
    if (route.view === "inbox")     return [{ label: "Inbox", icon: Ic.Inbox }];
    if (route.view === "ai") {
      const tab = AI_TABS.find(x => x.id === aiTab);
      return [{ label: "AI Tools", icon: Ic.Sparkle }, { label: tab?.label || "" }];
    }
    if (route.view === "subject") {
      const s = SUBJECTS.find(x => x.id === route.id);
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
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: "var(--accent)",
        animation: "ll-pulse-soft 1.8s infinite",
      }} />
      {workflowLabel} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· 25:00 timer ready</span>
    </div>
  ) : null;

  let body = null;
  if (route.view === "dashboard") body = <Dashboard setRoute={setRoute} workflow={t.workflow} />;
  else if (route.view === "subject") body = <SubjectRouter id={route.id} />;
  else if (route.view === "library") body = <Library />;
  else if (route.view === "calendar") body = <Calendar_View />;
  else if (route.view === "analytics") body = <Analytics />;
  else if (route.view === "inbox") body = <Inbox />;
  else if (route.view === "ai") {
    body = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{
          display: "flex", gap: 4, padding: "10px 32px 0",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}>
          {AI_TABS.map(tab => {
            const active = aiTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setAiTab(tab.id)} style={{
                padding: "8px 14px", borderRadius: 0,
                fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
                color: active ? "var(--ink)" : "var(--ink-3)",
                borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                marginBottom: -1, border: "none", background: "transparent", cursor: "pointer",
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <LegacyApp embedded activeTab={aiTab} setActiveTab={setAiTab} />
        </div>
      </div>
    );
  }

  // Extra sidebar entry for "AI Tools" — wire it through the Sidebar's
  // existing nav contract by injecting a synthetic subject-less entry.
  // (Shell's Sidebar takes route + setRoute, so we expose AI as a top-level view.)

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        route={route}
        setRoute={setRoute}
        subjects={SUBJECTS}
        workflow={t.workflow}
        setWorkflow={(w) => setTweak("workflow", w)}
        extraNav={[{ id: "ai", icon: Ic.Sparkle, label: "AI Tools" }]}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar
          crumbs={crumbs}
          right={right}
          theme={t.theme}
          setTheme={(th) => setTweak("theme", th)}
          onCmd={() => setCmdOpen(true)}
        />
        <div key={route.view + (route.id || "") + aiTab} style={{ flex: 1, overflow: "auto", animation: "ll-fade-in 220ms ease" }}>
          <div style={route.view === "ai" ? { height: "100%" } : { minWidth: "var(--min-canvas-w)" }}>
            {body}
          </div>
        </div>
      </main>

      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} subjects={SUBJECTS} setRoute={setRoute} />

      <TweaksPanel title="Tweaks">
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
      </TweaksPanel>
    </div>
  );
}
