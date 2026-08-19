import React, { useState, useEffect, useRef, useMemo } from "react";

const Ic = {
  Home:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/></svg>,
  Books: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h7v16H4z"/><path d="M11 4h6l3 16h-9"/></svg>,
  Cal:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  Chart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V8M10 20V4M16 20v-7M22 20H2"/></svg>,
  Search:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  Inbox: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="m3 13 3-8h12l3 8"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>,
  Bell:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>,
  Plus:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  Sun:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>,
  Moon:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>,
  Dot:   () => <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>,
  Pdf:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><text x="7" y="17" fontSize="5" fontFamily="monospace" fill="currentColor" stroke="none">PDF</text></svg>,
  Video: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="14" height="12" rx="2"/><path d="m21 8-4 4 4 4z"/></svg>,
  Code:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 4l-4 16"/></svg>,
  Note:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h11l4 4v14H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>,
  Card:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="14" height="13" rx="2"/><rect x="7" y="4" width="14" height="13" rx="2"/></svg>,
  Quiz:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.7"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>,
  Beaker:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6v5l5 11a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-11z"/><path d="M7.5 14h9"/></svg>,
  Atom:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></svg>,
  Sigma: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 5H6l6 7-6 7h12"/></svg>,
  Cell:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="9" cy="9" r=".8" fill="currentColor"/><circle cx="15" cy="14" r=".8" fill="currentColor"/></svg>,
  Quill: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20s4-2 8-6 6-9 6-9-7 2-11 6-3 9-3 9z"/><path d="M4 20s4 0 8-4"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>,
  Chev:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6"/></svg>,
  ChevD: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
  Cmd:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6a3 3 0 1 0-3 3h3zM15 6a3 3 0 1 1 3 3h-3zM9 18a3 3 0 1 1-3-3h3zM15 18a3 3 0 1 0 3-3h-3z"/><rect x="9" y="9" width="6" height="6"/></svg>,
  Flame: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3s5 4 5 9a5 5 0 1 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 1-6 1-8z"/></svg>,
  Timer: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M19 5l-1.5 1.5"/></svg>,
  Filter:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
  Bookmark: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>,
  Sparkle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></svg>,
  Cog:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Logout:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Bot:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8 14h.01M16 14h.01M2 14h2M20 14h2"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  Upload:() => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  Send:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>,
  X:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

const SUBJECT_ICONS = {
  math: Ic.Sigma, prog: Ic.Code, bio: Ic.Cell, chem: Ic.Beaker,
  lit: Ic.Quill, phys: Ic.Atom, hist: Ic.Globe,
};

const CUSTOM_COLORS = {
  indigo:  { l: "oklch(48% 0.13 265)", d: "oklch(72% 0.10 235)", sl: "oklch(94% 0.04 265)", sd: "oklch(28% 0.05 235)", ll: "oklch(80% 0.08 265)", ld: "oklch(40% 0.07 235)" },
  emerald: { l: "oklch(52% 0.11 155)", d: "oklch(74% 0.09 155)", sl: "oklch(94% 0.03 155)", sd: "oklch(26% 0.04 155)", ll: "oklch(80% 0.06 155)", ld: "oklch(38% 0.06 155)" },
  amber:   { l: "oklch(54% 0.12 75)",  d: "oklch(76% 0.10 80)",  sl: "oklch(95% 0.03 75)",  sd: "oklch(28% 0.05 80)",  ll: "oklch(82% 0.06 75)",  ld: "oklch(38% 0.07 80)" },
  violet:  { l: "oklch(46% 0.13 300)", d: "oklch(72% 0.10 295)", sl: "oklch(95% 0.03 300)", sd: "oklch(28% 0.05 295)", ll: "oklch(82% 0.06 300)", ld: "oklch(40% 0.07 295)" },
  rose:    { l: "oklch(50% 0.13 5)",   d: "oklch(74% 0.10 10)",  sl: "oklch(95% 0.03 5)",   sd: "oklch(28% 0.05 10)",  ll: "oklch(82% 0.06 5)",   ld: "oklch(38% 0.07 10)" },
  cyan:    { l: "oklch(52% 0.10 210)", d: "oklch(74% 0.09 210)", sl: "oklch(94% 0.03 210)", sd: "oklch(26% 0.04 210)", ll: "oklch(80% 0.06 210)", ld: "oklch(38% 0.06 210)" },
  slate:   { l: "oklch(40% 0.04 260)", d: "oklch(78% 0.02 260)", sl: "oklch(94% 0.01 260)", sd: "oklch(26% 0.01 260)", ll: "oklch(80% 0.02 260)", ld: "oklch(38% 0.02 260)" },
};

function getCustomColorVars(colorKey) {
  const c = CUSTOM_COLORS[colorKey] || CUSTOM_COLORS.indigo;
  const dark = document.documentElement.dataset.theme === "dark";
  return { "--s": dark ? c.d : c.l, "--s-soft": dark ? c.sd : c.sl, "--s-line": dark ? c.ld : c.ll };
}

function Sidebar({ route, setRoute, subjects, workflow, setWorkflow, user, onAddSubject, onLogout }) {
  const [openSubjects, setOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("ll-sidebar-collapsed") === "true");
  const [showLabels, setShowLabels] = useState(() => localStorage.getItem("ll-sidebar-collapsed") !== "true");

  useEffect(() => { localStorage.setItem("ll-sidebar-collapsed", collapsed); }, [collapsed]);

  const toggleCollapse = () => {
    if (collapsed) {
      setCollapsed(false);
      setTimeout(() => setShowLabels(true), 220);
    } else {
      setShowLabels(false);
      setCollapsed(true);
    }
  };

  const NavItem = ({ id, icon: I, label, badge }) => {
    const active = route.view === id;
    return (
      <button
        onClick={() => setRoute({ view: id })}
        title={!showLabels ? label : undefined}
        style={{
          display: "flex", alignItems: "center", justifyContent: !showLabels ? "center" : undefined,
          gap: showLabels ? 10 : 0, width: "100%",
          padding: showLabels ? "7px 10px" : "9px 0", borderRadius: "var(--r)",
          color: active ? "var(--ink)" : "var(--ink-2)",
          background: active ? "var(--surface-2)" : "transparent",
          fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
          transition: "background 120ms",
        }}
        onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--surface-2)")}
        onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ width: 16, height: 16, color: active ? "var(--accent)" : "var(--ink-3)", flexShrink: 0 }}><I /></span>
        {showLabels && <span style={{ flex: 1, textAlign: "left" }}>{label}</span>}
        {showLabels && badge && <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{badge}</span>}
      </button>
    );
  };

  const SubjectItem = ({ s }) => {
    const SI = SUBJECT_ICONS[s.id];
    const isCustom = !SI;
    const CI = isCustom && s.icon ? Ic[s.icon] : null;
    const active = route.view === "subject" && route.id === s.id;
    const colorVars = isCustom ? getCustomColorVars(s.color) : {};
    return (
      <button
        data-subject={s.id}
        onClick={() => setRoute({ view: "subject", id: s.id })}
        title={!showLabels ? s.name : undefined}
        style={{
          display: "flex", alignItems: "center", justifyContent: !showLabels ? "center" : undefined,
          gap: showLabels ? 10 : 0, width: "100%",
          padding: showLabels ? "6px 10px 6px 22px" : "7px 0", borderRadius: "var(--r)",
          color: active ? "var(--ink)" : "var(--ink-2)",
          background: active ? "var(--surface-2)" : "transparent",
          fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
          position: "relative", ...colorVars,
        }}
        onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--surface-2)")}
        onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
      >
        {showLabels && (
          <span style={{
            position: "absolute", left: 10, top: 6, bottom: 6, width: 3,
            background: active ? "var(--s)" : "transparent", borderRadius: 2,
          }} />
        )}
        <span style={{ width: 14, height: 14, color: "var(--s)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          {SI ? <SI /> : CI ? <CI /> : (
            <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
              {(s.name || "?").slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        {showLabels && <span style={{ flex: 1, textAlign: "left" }}>{s.name}</span>}
        {showLabels && <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{s.progress}%</span>}
      </button>
    );
  };

  return (
    <aside style={{
      width: collapsed ? 64 : "var(--rail-w)", borderRight: "1px solid var(--line)",
      background: "var(--rail)", display: "flex", flexDirection: "column",
      flexShrink: 0, height: "100%",
      transition: "width 240ms cubic-bezier(0.4, 0, 0.2, 1)", overflow: "hidden",
    }}>
      <div style={{
        padding: showLabels ? "14px 14px 12px" : "14px 0 12px",
        display: "flex", alignItems: "center", gap: 9,
        justifyContent: showLabels ? undefined : "center",
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: 6, background: "var(--ink)",
          display: "grid", placeItems: "center", color: "var(--bg)",
          fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, flexShrink: 0,
        }}>L</span>
        {showLabels && (
          <div style={{ flex: 1, lineHeight: 1.1 }}>
            <div style={{ fontWeight: 600, fontSize: "var(--fs-15)", letterSpacing: "-0.01em" }}>LearnLens</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>academic.os · v3</div>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{ width: 20, height: 20, display: "grid", placeItems: "center", color: "var(--ink-3)", borderRadius: "var(--r-sm)", flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--ink)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--ink-3)"}
        >
          <span style={{ width: 13, height: 13, transform: collapsed ? "none" : "rotate(180deg)", transition: "transform 240ms" }}><Ic.Chev /></span>
        </button>
      </div>

      <nav style={{ padding: showLabels ? "8px 10px" : "8px 4px", display: "flex", flexDirection: "column", gap: 1 }}>
        <NavItem id="dashboard" icon={Ic.Home}  label="Today" />
        <NavItem id="calendar"  icon={Ic.Cal}   label="Calendar" />
        <NavItem id="analytics" icon={Ic.Chart} label="Analytics" />
      </nav>

      <div style={{
        padding: showLabels ? "12px 14px 4px" : "12px 0 4px",
        display: "flex", alignItems: "center",
        justifyContent: showLabels ? "space-between" : "center",
      }}>
        {showLabels && (
          <button onClick={() => setOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 4, color: "var(--ink-3)",
            fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500,
          }}>
            <span style={{ width: 10, height: 10, transform: openSubjects ? "rotate(90deg)" : "none", transition: "transform 120ms" }}><Ic.Chev /></span>
            Subjects {subjects.length > 0 && <span className="mono" style={{ color: "var(--ink-4)", marginLeft: 2 }}>{subjects.length}</span>}
          </button>
        )}
        <button onClick={onAddSubject} title="Add subject" style={{ color: "var(--ink-3)", width: 14, height: 14 }}><Ic.Plus /></button>
      </div>

      {(openSubjects || !showLabels) && (
        <div style={{ padding: showLabels ? "2px 10px" : "2px 4px", display: "flex", flexDirection: "column", gap: 1 }}>
          {subjects.length === 0 ? (
            showLabels && (
              <button onClick={onAddSubject} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: "var(--r)",
                border: "1px dashed var(--line-strong)",
                color: "var(--ink-3)", fontSize: 12,
                background: "transparent",
              }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent-line)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--ink-3)"; e.currentTarget.style.borderColor = "var(--line-strong)"; }}>
                <span style={{ width: 12, height: 12 }}><Ic.Plus /></span>
                Add your first subject
              </button>
            )
          ) : (
            subjects.map(s => <SubjectItem key={s.id} s={s} />)
          )}
        </div>
      )}

      <div style={{ marginTop: "auto", padding: showLabels ? "12px 14px" : "12px 0", borderTop: "1px solid var(--line)" }}>
        {showLabels && <div className="label-xs" style={{ marginBottom: 8 }}>Workflow</div>}
        <WorkflowSwitch value={workflow} onChange={setWorkflow} collapsed={!showLabels} />
        <ProfileWidget user={user} collapsed={!showLabels} onLogout={onLogout} />
      </div>
    </aside>
  );
}

function ProfileWidget({ user, collapsed, onLogout }) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ bottom: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const u = user || { name: "Student", initials: "S?", role: "—", level: 1, xp: 0, xpForNext: 100, currentStreak: 0, longestStreak: 0, status: { label: "Online", emoji: "🟢" }, avatarHue: 265 };
  const xpPct = Math.min(1, u.xp / u.xpForNext);
  const streakPct = Math.min(1, u.currentStreak / Math.max(u.longestStreak, 1));
  const ringSize = 44, stroke = 2.2, r = (ringSize - stroke) / 2;
  const c = 2 * Math.PI * r;

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopupPos({ bottom: window.innerHeight - rect.top + 6, left: rect.left, width: rect.width });
    }
    setOpen(o => !o);
  };

  if (collapsed) {
    const cs = 36, cStroke = 2, cR = (cs - cStroke) / 2, cC = 2 * Math.PI * cR;
    return (
      <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        <div title={u.name} style={{ position: "relative", width: cs, height: cs }}>
          <svg width={cs} height={cs} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx={cs/2} cy={cs/2} r={cR} fill="none" stroke="var(--line)" strokeWidth={cStroke} />
            <circle cx={cs/2} cy={cs/2} r={cR} fill="none" stroke={`oklch(70% 0.13 ${u.avatarHue})`}
              strokeWidth={cStroke} strokeLinecap="round"
              strokeDasharray={cC} strokeDashoffset={cC * (1 - streakPct)} />
          </svg>
          <div style={{
            position: "absolute", inset: 3, borderRadius: "50%",
            background: `linear-gradient(135deg, oklch(82% 0.08 ${u.avatarHue}), oklch(56% 0.14 ${u.avatarHue}))`,
            display: "grid", placeItems: "center",
            color: "white", fontWeight: 600, fontSize: 10,
            letterSpacing: "0.02em",
            boxShadow: "inset 0 0 0 1px color-mix(in oklch, white 20%, transparent)",
          }}>{u.initials}</div>
          <span style={{
            position: "absolute", right: -1, bottom: -1, width: 8, height: 8,
            borderRadius: "50%", background: "var(--ok)",
            border: "2px solid var(--rail)",
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <button ref={btnRef} onClick={handleToggle} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 8px 8px 6px", borderRadius: 10,
        background: open ? "var(--surface-2)" : "transparent",
        border: "1px solid", borderColor: open ? "var(--line)" : "transparent",
        transition: "background 120ms, border-color 120ms",
      }}>
        <div style={{ position: "relative", width: ringSize, height: ringSize, flexShrink: 0 }}>
          <svg width={ringSize} height={ringSize} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
            <circle cx={ringSize/2} cy={ringSize/2} r={r} fill="none"
              stroke={`oklch(70% 0.13 ${u.avatarHue})`}
              strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - streakPct)} />
          </svg>
          <div style={{
            position: "absolute", inset: 4, borderRadius: "50%",
            background: `linear-gradient(135deg, oklch(82% 0.08 ${u.avatarHue}), oklch(56% 0.14 ${u.avatarHue}))`,
            display: "grid", placeItems: "center",
            color: "white", fontWeight: 600, fontSize: 12,
            letterSpacing: "0.02em",
            boxShadow: "inset 0 0 0 1px color-mix(in oklch, white 20%, transparent)",
          }}>{u.initials}</div>
          <span style={{
            position: "absolute", right: -1, bottom: -1, width: 10, height: 10,
            borderRadius: "50%", background: "var(--ok)",
            border: "2px solid var(--rail)",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, lineHeight: 1.1 }}>
            <span style={{ fontSize: "var(--fs-13)", fontWeight: 600, letterSpacing: "-0.005em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 110 }}>
              {u.name}
            </span>
            <span className="mono" style={{
              fontSize: 9.5, padding: "1px 5px", borderRadius: 3,
              background: "var(--accent-soft)", color: "var(--accent)",
              border: "1px solid var(--accent-line)", fontWeight: 600,
            }}>L{u.level}</span>
          </div>
          <div style={{ marginTop: 5, height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${xpPct * 100}%`, height: "100%",
              background: "linear-gradient(90deg, var(--accent), color-mix(in oklch, var(--accent) 70%, white))" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 10, color: "var(--ink-3)" }}>
            <span>{u.status?.emoji}</span>
            <span>{u.status?.label}</span>
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ width: 9, height: 9, color: "var(--due)" }}><Ic.Flame /></span>
              <span className="tabular">{u.currentStreak}</span>
            </span>
          </div>
        </div>
        <span style={{ width: 11, height: 11, color: "var(--ink-3)",
          transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms" }}>
          <Ic.ChevD />
        </span>
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: popupPos.bottom, left: popupPos.left, width: popupPos.width,
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 6, zIndex: 200,
          animation: "ll-fade-in 140ms ease",
        }}>
          <ProfileMenuRow icon={Ic.Sparkle} label="Set status"   hint={u.status?.label} />
          <ProfileMenuRow icon={Ic.Note}    label="My notes"     hint="all subjects" />
          <ProfileMenuRow icon={Ic.Chart}   label="View profile" hint={`L${u.level} · ${u.xp} XP`} />
          <ProfileMenuRow icon={Ic.Cog}     label="Settings"     hint="preferences" />
          <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 6px" }} />
          <ProfileMenuRow icon={Ic.Logout}  label="Sign out"     tone="danger" onClick={onLogout} />
        </div>
      )}
    </div>
  );
}

function ProfileMenuRow({ icon: I, label, hint, tone, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        padding: "7px 10px", borderRadius: 6,
        color: tone === "danger" ? "var(--due)" : "var(--ink-2)",
        fontSize: "var(--fs-13)", textAlign: "left",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <span style={{ width: 13, height: 13, color: tone === "danger" ? "var(--due)" : "var(--ink-3)" }}><I /></span>
      <span style={{ flex: 1 }}>{label}</span>
      {hint && <span className="mono" style={{ fontSize: 10, color: "var(--ink-4)" }}>{hint}</span>}
    </button>
  );
}

const WORKFLOWS = [
  { id: "study",   label: "Deep study",     hint: "Reading focus, longer sessions" },
  { id: "rev",     label: "Revision",       hint: "Recall, summaries, spaced reps" },
  { id: "exam",    label: "Exam prep",      hint: "Timer, PYQs, weak-area drills" },
];

function WorkflowSwitch({ value, onChange, collapsed }) {
  if (collapsed) {
    const active = WORKFLOWS.find(w => w.id === value);
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
        <span title={active?.label} style={{
          width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", display: "block",
        }} />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {WORKFLOWS.map(w => {
        const active = value === w.id;
        return (
          <button key={w.id} onClick={() => onChange(w.id)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "5px 8px",
            borderRadius: "var(--r-sm)",
            background: active ? "var(--accent-soft)" : "transparent",
            color: active ? "var(--accent)" : "var(--ink-2)",
            fontSize: "var(--fs-13)", fontWeight: active ? 500 : 400,
            textAlign: "left",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: active ? "var(--accent)" : "var(--line-strong)",
            }} />
            {w.label}
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ crumbs, right, theme, setTheme, onCmd }) {
  return (
    <header style={{
      height: "var(--top-h)", borderBottom: "1px solid var(--line)",
      background: "color-mix(in oklch, var(--bg) 92%, transparent)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", padding: "0 18px", gap: 14,
      position: "sticky", top: 0, zIndex: 30,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: "var(--ink-4)", fontSize: 12 }}>/</span>}
            <span style={{
              fontSize: "var(--fs-14)",
              color: i === crumbs.length - 1 ? "var(--ink)" : "var(--ink-3)",
              fontWeight: i === crumbs.length - 1 ? 500 : 400,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {c.icon && <span style={{ width: 14, height: 14, color: c.color || "var(--ink-3)" }}><c.icon /></span>}
              {c.label}
            </span>
          </React.Fragment>
        ))}
      </div>

      {right}

      <button onClick={onCmd} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 8px",
        border: "1px solid var(--line)", borderRadius: "var(--r-sm)",
        background: "var(--surface)", color: "var(--ink-3)", fontSize: "var(--fs-13)",
      }}>
        <span style={{ width: 13, height: 13 }}><Ic.Search /></span>
        Search anything
        <span className="mono" style={{ fontSize: 10, padding: "1px 5px", border: "1px solid var(--line)", borderRadius: 3 }}>⌘K</span>
      </button>

      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={{
        width: 30, height: 30, display: "grid", placeItems: "center",
        borderRadius: "var(--r-sm)", color: "var(--ink-2)",
      }} title="Toggle theme">
        <span style={{ width: 15, height: 15 }}>{theme === "light" ? <Ic.Moon /> : <Ic.Sun />}</span>
      </button>

    </header>
  );
}

function CommandBar({ open, onClose, subjects, setRoute }) {
  const [q, setQ] = useState("");
  const ref = useRef(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 30); }, [open]);

  const items = useMemo(() => {
    const base = [
      ...subjects.map(s => ({ kind: "Subject", label: s.name, hint: s.title, action: () => setRoute({ view: "subject", id: s.id }) })),
      { kind: "View",   label: "Today",               hint: "Dashboard",             action: () => setRoute({ view: "dashboard" }) },
      { kind: "View",   label: "Calendar",             hint: "Week & term",           action: () => setRoute({ view: "calendar" }) },
      { kind: "Action", label: "Start 25-min focus",   hint: "Pomodoro · current subject" },
      { kind: "Action", label: "New annotation",       hint: "Highlight selected passage" },
      { kind: "Action", label: "Generate quiz",        hint: "From current notes" },
    ];
    if (!q) return base.slice(0, 8);
    return base.filter(i => (i.label + i.hint).toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  }, [q, subjects, setRoute]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "color-mix(in oklch, var(--bg) 60%, black 40%)",
      backdropFilter: "blur(4px)", zIndex: 100,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      paddingTop: "12vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 560, background: "var(--surface)", border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-lg)", overflow: "hidden",
        animation: "ll-fade-in 160ms ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ width: 16, height: 16, color: "var(--ink-3)" }}><Ic.Search /></span>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search subjects, resources, theorems, files…"
            style={{ flex: 1, background: "none", border: 0, outline: "none", fontSize: "var(--fs-15)" }} />
          <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>ESC</span>
        </div>
        <div style={{ padding: "8px 0", maxHeight: 380, overflowY: "auto" }}>
          {items.map((it, i) => (
            <button key={i} onClick={() => { it.action?.(); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "8px 16px", textAlign: "left",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="mono" style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 3,
                background: "var(--surface-2)", color: "var(--ink-3)", minWidth: 56, textAlign: "center",
              }}>{it.kind}</span>
              <span style={{ fontSize: "var(--fs-14)", fontWeight: 500 }}>{it.label}</span>
              <span style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)", flex: 1 }}>{it.hint}</span>
              <span style={{ width: 12, height: 12, color: "var(--ink-4)" }}><Ic.Chev /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tone = "neutral", subject, style }) {
  const map = {
    neutral: { bg: "var(--surface-2)", c: "var(--ink-2)", b: "var(--line)" },
    accent:  { bg: "var(--accent-soft)", c: "var(--accent)", b: "var(--accent-line)" },
    ok:      { bg: "var(--ok-soft)", c: "var(--ok)", b: "color-mix(in oklch, var(--ok) 30%, var(--line))" },
    warn:    { bg: "var(--warn-soft)", c: "var(--warn)", b: "color-mix(in oklch, var(--warn) 30%, var(--line))" },
    due:     { bg: "var(--due-soft)", c: "var(--due)", b: "color-mix(in oklch, var(--due) 30%, var(--line))" },
    subject: { bg: "var(--s-soft)", c: "var(--s)", b: "var(--s-line)" },
  };
  const t = map[tone] || map.neutral;
  return (
    <span data-subject={subject} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10.5, fontWeight: 500, letterSpacing: "0.02em",
      padding: "1.5px 7px", borderRadius: 100,
      background: t.bg, color: t.c, border: `1px solid ${t.b}`,
      ...style,
    }}>{children}</span>
  );
}

function Btn({ children, variant = "default", icon: I, onClick, style }) {
  const map = {
    default: { bg: "var(--surface)", c: "var(--ink)", b: "var(--line)" },
    primary: { bg: "var(--ink)", c: "var(--bg)", b: "var(--ink)" },
    accent:  { bg: "var(--accent)", c: "var(--on-accent)", b: "var(--accent)" },
    ghost:   { bg: "transparent", c: "var(--ink-2)", b: "transparent" },
  };
  const t = map[variant];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "6px 11px", borderRadius: "var(--r-sm)",
      background: t.bg, color: t.c, border: `1px solid ${t.b}`,
      fontSize: "var(--fs-13)", fontWeight: 500,
      transition: "all 120ms", ...style,
    }}
      onMouseEnter={e => {
        if (variant === "default" || variant === "ghost") e.currentTarget.style.background = "var(--surface-2)";
      }}
      onMouseLeave={e => { e.currentTarget.style.background = t.bg; }}>
      {I && <span style={{ width: 13, height: 13 }}><I /></span>}
      {children}
    </button>
  );
}

function Card({ children, style, subject, accent, padded = true }) {
  return (
    <div data-subject={subject} style={{
      background: "var(--surface)",
      border: `1px solid ${accent ? "var(--s-line)" : "var(--line)"}`,
      borderRadius: "var(--r-lg)",
      padding: padded ? "var(--sp-5)" : 0,
      boxShadow: "var(--shadow-sm)",
      ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ kicker, title, action, style }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12, ...style }}>
      <div>
        {kicker && <div className="label-xs" style={{ marginBottom: 4 }}>{kicker}</div>}
        <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>{title}</div>
      </div>
      {action}
    </div>
  );
}

export { Ic, SUBJECT_ICONS, CUSTOM_COLORS, getCustomColorVars, Sidebar, TopBar, CommandBar, Pill, Btn, Card, SectionTitle, WORKFLOWS };
