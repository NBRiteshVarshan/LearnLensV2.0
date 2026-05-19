/**
 * Lightweight, self-contained Tweaks panel.
 * No host postMessage protocol — purely local state + localStorage persistence.
 * Toggled via the gear button it renders in the bottom-right.
 */
import React, { useState, useEffect, useRef } from "react";

const STORE_KEY = "learnlens.tweaks";

export function useTweaks(defaults) {
  const [values, setValues] = useState(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  });

  const setTweak = (keyOrPatch, val) => {
    setValues(prev => {
      const next = typeof keyOrPatch === "object"
        ? { ...prev, ...keyOrPatch }
        : { ...prev, [keyOrPatch]: val };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return [values, setTweak];
}

export function TweaksPanel({ title = "Tweaks", children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const panelRef = useRef(null);

  // Drag handler — bottom-right anchored offsets.
  const onDragStart = (e) => {
    const panel = panelRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const sr = window.innerWidth - r.right;
    const sb = window.innerHeight - r.bottom;
    const move = (ev) => setPos({
      x: Math.max(8, sr - (ev.clientX - sx)),
      y: Math.max(8, sb - (ev.clientY - sy)),
    });
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        title="Tweaks"
        style={{
          position: "fixed", right: 16, bottom: 16, zIndex: 90,
          width: 38, height: 38, borderRadius: "50%",
          background: "var(--ink)", color: "var(--bg)",
          border: "1px solid var(--line-strong)",
          display: open ? "none" : "grid", placeItems: "center",
          boxShadow: "var(--shadow-md)", cursor: "pointer",
        }}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>

      {open && (
        <div ref={panelRef} style={{
          position: "fixed", right: pos.x, bottom: pos.y, zIndex: 95,
          width: 280, background: "var(--surface)",
          border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)", overflow: "hidden",
          fontFamily: "var(--font-sans)", color: "var(--ink)", fontSize: 13,
        }}>
          <div onMouseDown={onDragStart} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)", cursor: "move", userSelect: "none",
          }}>
            <div style={{
              fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--ink-3)", fontWeight: 500,
            }}>{title}</div>
            <button onClick={() => setOpen(false)} style={{
              width: 20, height: 20, borderRadius: 4, color: "var(--ink-2)",
              border: "none", background: "transparent", cursor: "pointer",
              display: "grid", placeItems: "center",
            }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M6 18 18 6" />
              </svg>
            </button>
          </div>
          <div style={{ padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export function TweakSection({ label, children }) {
  return (
    <>
      <div style={{
        fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--ink-3)", fontWeight: 500,
        margin: "8px 0 6px",
      }}>{label}</div>
      {children}
    </>
  );
}

export function TweakRadio({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>{label}</div>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 2, padding: 2,
        background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--line)",
      }}>
        {options.map(o => {
          const v = typeof o === "object" ? o.value : o;
          const l = typeof o === "object" ? o.label : o;
          const on = v === value;
          return (
            <button key={v} onClick={() => onChange(v)} style={{
              padding: "5px 8px", borderRadius: 4, fontSize: 11.5,
              background: on ? "var(--surface)" : "transparent",
              color: on ? "var(--ink)" : "var(--ink-2)",
              fontWeight: on ? 500 : 400,
              border: "none", cursor: "pointer",
              boxShadow: on ? "var(--shadow-sm)" : "none",
            }}>{l}</button>
          );
        })}
      </div>
    </div>
  );
}

export function TweakSelect({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "6px 8px", borderRadius: 6,
        background: "var(--surface-2)", border: "1px solid var(--line)",
        color: "var(--ink)", fontSize: 12, cursor: "pointer",
      }}>
        {options.map(o => (
          <option key={typeof o === "object" ? o.value : o} value={typeof o === "object" ? o.value : o}>
            {typeof o === "object" ? o.label : o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TweakToggle({ label, value, onChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "5px 0", fontSize: 12, color: "var(--ink-2)",
    }}>
      <span>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 30, height: 16, borderRadius: 100, position: "relative",
        background: value ? "var(--accent)" : "var(--line-strong)",
        border: "none", cursor: "pointer", transition: "background 160ms",
      }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 16 : 2,
          width: 12, height: 12, borderRadius: "50%", background: "var(--surface)",
          transition: "left 160ms",
        }} />
      </button>
    </div>
  );
}

export function TweakColor({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 6 }}>
        {options.map(c => (
          <button key={c} onClick={() => onChange(c)} title={c} style={{
            width: 26, height: 26, borderRadius: 6,
            background: c, cursor: "pointer",
            border: c === value ? "2px solid var(--ink)" : "1px solid var(--line)",
            boxShadow: c === value ? "0 0 0 2px var(--surface)" : "none",
            outline: c === value ? "1px solid var(--ink)" : "none",
            outlineOffset: c === value ? 1 : 0,
          }} />
        ))}
      </div>
    </div>
  );
}
