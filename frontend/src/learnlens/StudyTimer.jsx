import React, { useState, useEffect, useRef, useContext, createContext } from "react";
import { useStudyTimer, MODES } from "./useStudyTimer.js";
import { Ic } from "./Shell.jsx";

// ── Context ───────────────────────────────────────────────────────────────────
// TimerProvider wraps the app once. Every component can call useTimer() to
// read shared timer state without prop-drilling.
const TimerCtx = createContext(null);

export function TimerProvider({ children }) {
  const timer = useStudyTimer();
  return <TimerCtx.Provider value={timer}>{children}</TimerCtx.Provider>;
}

export function useTimer() {
  return useContext(TimerCtx);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function fmtTimer(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Gentle ascending three-note chord (C5 E5 G5) via Web Audio API — no files needed.
function playDoneSound(isBreak) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const notes = isBreak ? [440] : [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g);
      g.connect(ac.destination);
      o.type = "sine";
      o.frequency.value = freq;
      const t = ac.currentTime + i * 0.19;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
      o.start(t);
      o.stop(t + 0.55);
    });
  } catch {}
}

function sendNotification(title, body) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body, silent: true }); } catch {}
  }
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
// SVG ring with a subtle glow filter while the timer is running.
export function ProgressRing({ progress, size = 160, strokeWidth = 5, isRunning, isCompleted, isBreak }) {
  const r    = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const color = isCompleted || isBreak ? "var(--ok)" : "var(--accent)";
  const glowId = "ll-ring-glow";

  return (
    <svg
      width={size} height={size}
      style={{ transform: "rotate(-90deg)", overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--line)" strokeWidth={strokeWidth}
      />
      {/* Fill */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        filter={isRunning ? `url(#${glowId})` : "none"}
        style={{ transition: "stroke-dashoffset 0.45s ease, stroke 0.3s ease" }}
      />
    </svg>
  );
}

// ── Timer Pill ────────────────────────────────────────────────────────────────
// The top-bar element. Replaces the static "Deep study · 25:00 timer ready" pill.
const WORKFLOW_LABELS = {
  study: "Deep study",
  rev:   "Revision",
  exam:  "Exam prep",
  quick: "Quick",
};

export function TimerPill({ onOpen, workflow, showWorkflow = true }) {
  const t = useTimer();
  if (!t) return null;
  const { status, mode, displaySecs, isBreak } = t;

  const modeLabel = WORKFLOW_LABELS[workflow] || MODES[mode].label;
  const label = (() => {
    if (status === "idle") {
      return showWorkflow
        ? `${modeLabel} · ${fmtTimer(MODES[mode].secs)} timer ready`
        : `${fmtTimer(MODES[mode].secs)} timer ready`;
    }
    if (status === "completed") return isBreak ? "Break done ✓" : "Session complete ✓";
    const prefix = showWorkflow ? (isBreak ? "Break" : modeLabel) : (isBreak ? "Break" : "Focus");
    return `${prefix} · ${fmtTimer(displaySecs)}`;
  })();

  const isRunning  = status === "running";
  const isCompleted = status === "completed";
  const color      = isCompleted || isBreak ? "var(--ok)"       : "var(--accent)";
  const softColor  = isCompleted || isBreak ? "var(--ok-soft)"  : "var(--accent-soft)";
  const lineColor  = isCompleted || isBreak
    ? "color-mix(in oklch, var(--ok) 30%, var(--line))"
    : "var(--accent-line)";

  return (
    <button
      onClick={onOpen}
      aria-label={`Study timer: ${label}. Click to open timer.`}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "5px 12px",
        borderRadius: 100,
        border: `1px solid ${lineColor}`,
        background: softColor,
        color,
        fontSize: "var(--fs-13)", fontWeight: 500,
        transition: "filter 120ms",
        animation: isCompleted ? "ll-glow-pulse 1.8s ease infinite" : "none",
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.93)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: color,
        flexShrink: 0,
        animation: isRunning ? "ll-pulse-soft 1.4s infinite" : "none",
      }} />
      <span className="tabular">{label}</span>
    </button>
  );
}

// ── Mode selector options ─────────────────────────────────────────────────────
const MODE_OPTS = [
  { id: "study", label: "Deep study",  mins: 25 },
  { id: "short", label: "Short break", mins: 5  },
  { id: "long",  label: "Long break",  mins: 15 },
];

// ── Timer Panel ───────────────────────────────────────────────────────────────
// A centered modal that opens when the user clicks the pill.
export function TimerPanel({ open, onClose }) {
  const t = useTimer();
  const prevStatus = useRef(null);
  const [flashKey, setFlashKey] = useState(0);

  // Detect transition into "completed" to trigger sound + notification
  useEffect(() => {
    if (prevStatus.current !== null
        && prevStatus.current !== "completed"
        && t.status === "completed") {
      playDoneSound(t.isBreak);
      sendNotification(
        t.isBreak ? "Break over!" : "Session complete 🎯",
        t.isBreak
          ? "Time to get back to work."
          : `${t.sessionCount} session${t.sessionCount !== 1 ? "s" : ""} today. Take a short break?`
      );
      setFlashKey(k => k + 1);
    }
    prevStatus.current = t.status;
  }, [t.status, t.isBreak, t.sessionCount]);

  // Keyboard shortcuts — only active when the panel is open
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      // Never fire inside text inputs
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      // Never fire with modifier keys (don't steal ⌘K etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === " ") {
        e.preventDefault();
        t.status === "running" ? t.pause() : t.start();
      }
      if (e.key.toLowerCase() === "r") t.reset();
      if (e.key.toLowerCase() === "s" && t.status !== "running") t.start();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, t, onClose]);

  // Ask for notification permission elegantly on first panel open
  useEffect(() => {
    if (open && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [open]);

  if (!open) return null;

  const { mode, status, displaySecs, progress, sessionCount, isBreak,
    start, pause, reset, setMode, startBreak, skipToStudy } = t;

  const isRunning   = status === "running";
  const isPaused    = status === "paused";
  const isIdle      = status === "idle";
  const isCompleted = status === "completed";
  const accentColor = isBreak || isCompleted ? "var(--ok)" : "var(--accent)";

  // After 4 study sessions, offer a long break
  const suggestedBreak = sessionCount > 0 && sessionCount % 4 === 0 ? "long" : "short";

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "color-mix(in oklch, var(--bg) 52%, black 48%)",
          backdropFilter: "blur(5px)",
          animation: "ll-fade-in 180ms ease",
        }}
      />

      {/* ── Panel ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deep Study Timer"
        style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(430px, 92vw)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-lg), 0 0 0 1px var(--line-soft) inset",
          overflow: "hidden",
          animation: "ll-panel-in 220ms cubic-bezier(0.34, 1.4, 0.64, 1)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid var(--line-soft)",
        }}>
          <div>
            <div className="label-xs">{isBreak ? "break mode" : "focus mode"}</div>
            <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, letterSpacing: "-0.01em" }}>
              Deep Study Timer
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Session count badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 100,
              background: "var(--surface-2)", border: "1px solid var(--line)",
              fontSize: 11.5, color: "var(--ink-2)",
            }}>
              <span style={{ width: 11, height: 11, color: "var(--due)" }}><Ic.Flame /></span>
              <span className="mono tabular">{sessionCount}</span>
              <span style={{ color: "var(--ink-3)" }}>sessions</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close timer (Esc)"
              title="Close (Esc)"
              style={{
                width: 26, height: 26, borderRadius: 6,
                display: "grid", placeItems: "center",
                color: "var(--ink-3)", transition: "background 100ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = ""; }}
            >
              <span style={{ width: 13, height: 13 }}><Ic.X /></span>
            </button>
          </div>
        </div>

        {/* ── Mode selector ── */}
        <div style={{ display: "flex", gap: 6, padding: "10px 16px 0" }}>
          {MODE_OPTS.map(m => {
            const active    = mode === m.id;
            const isBreakOpt = m.id !== "study";
            const activeAccent = isBreakOpt ? "var(--ok)" : "var(--accent)";
            const activeSoft   = isBreakOpt ? "var(--ok-soft)" : "var(--accent-soft)";
            const activeLine   = isBreakOpt
              ? "color-mix(in oklch, var(--ok) 25%, var(--line))"
              : "var(--accent-line)";
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                aria-pressed={active}
                style={{
                  flex: 1, padding: "5px 6px", borderRadius: 8,
                  fontSize: 11.5, fontWeight: active ? 500 : 400,
                  lineHeight: 1.35, textAlign: "center",
                  background: active ? activeSoft : "var(--surface-2)",
                  color: active ? activeAccent : "var(--ink-3)",
                  border: `1px solid ${active ? activeLine : "transparent"}`,
                  transition: "all 120ms",
                }}
                onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--surface-3)")}
                onMouseLeave={e => !active && (e.currentTarget.style.background = "var(--surface-2)")}
              >
                <div>{m.label}</div>
                <div className="mono" style={{ fontSize: 10, opacity: 0.65, marginTop: 1 }}>{m.mins} min</div>
              </button>
            );
          })}
        </div>

        {/* ── Ring + countdown ── */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "28px 16px 20px",
          position: "relative",
        }}>
          {/* Completion flash overlay — re-keyed so the animation replays on each completion */}
          <div
            key={`flash-${flashKey}`}
            style={{
              position: "absolute", inset: 0,
              background: isBreak ? "var(--ok-soft)" : "var(--accent-soft)",
              opacity: 0,
              pointerEvents: "none",
              animation: flashKey > 0 ? "ll-completion-flash 2.6s ease forwards" : "none",
            }}
          />

          {/* Breathing ambient glow while running */}
          {isRunning && (
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 200, height: 200,
                borderRadius: "50%",
                top: "50%", left: "50%",
                transform: "translate(-50%, -48%)",
                background: `radial-gradient(circle, ${isBreak ? "var(--ok-soft)" : "var(--accent-soft)"} 0%, transparent 70%)`,
                animation: "ll-breathe-glow 4s ease-in-out infinite",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Ring */}
          <div style={{ position: "relative", width: 166, height: 166 }}>
            <ProgressRing
              progress={progress}
              size={166}
              strokeWidth={5}
              isRunning={isRunning}
              isCompleted={isCompleted}
              isBreak={isBreak}
            />

            {/* Countdown */}
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div
                className="mono tabular"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 44, fontWeight: 400,
                  letterSpacing: "-0.03em", lineHeight: 1,
                  color: isCompleted ? "var(--ok)" : "var(--ink)",
                  fontVariantNumeric: "tabular-nums",
                  animation: isRunning ? "ll-breathe 4s ease-in-out infinite" : "none",
                }}
                aria-live="polite"
                aria-atomic="true"
                aria-label={`${Math.floor(displaySecs / 60)} minutes ${displaySecs % 60} seconds remaining`}
              >
                {fmtTimer(displaySecs)}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600, marginTop: 6,
                color: "var(--ink-4)",
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                {isIdle      && "ready"}
                {isRunning   && (isBreak ? "break" : "focused")}
                {isPaused    && "paused"}
                {isCompleted && "done"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Controls ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, padding: "0 16px 20px",
        }}>
          {/* Reset */}
          <CtrlBtn onClick={reset} aria-label="Reset (R)" title="Reset (R)">
            <ResetSvg />
          </CtrlBtn>

          {/* Play / Pause — the primary button */}
          <button
            onClick={isRunning ? pause : start}
            disabled={isCompleted}
            aria-label={isRunning ? "Pause (Space)" : isCompleted ? "Session done" : "Start (Space)"}
            title={isRunning ? "Pause (Space)" : "Start (Space)"}
            style={{
              width: 58, height: 58, borderRadius: 17,
              border: "none",
              background: isCompleted ? "var(--ok)" : accentColor,
              color: "white",
              display: "grid", placeItems: "center",
              transition: "all 140ms",
              opacity: isCompleted ? 0.65 : 1,
              boxShadow: isRunning ? `0 6px 22px -6px ${accentColor}bb` : "none",
            }}
            onMouseEnter={e => !isCompleted && (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
          >
            {isRunning   ? <PauseSvg /> :
             isCompleted ? <CheckSvg /> :
                           <PlaySvg />}
          </button>

          {/* Skip / break toggle */}
          <CtrlBtn
            onClick={isBreak ? skipToStudy : () => startBreak(suggestedBreak)}
            aria-label={isBreak ? "Skip break" : suggestedBreak === "long" ? "Long break" : "Short break"}
            title={isBreak ? "Skip break" : "Take break"}
          >
            <SkipSvg />
          </CtrlBtn>
        </div>

        {/* ── Completion CTA ── */}
        {isCompleted && (
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--line-soft)",
            background: isBreak ? "var(--ok-soft)" : "var(--accent-soft)",
            animation: "ll-fade-in 300ms ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{
                  fontSize: "var(--fs-13)", fontWeight: 500,
                  color: isBreak ? "var(--ok)" : "var(--accent)",
                }}>
                  {isBreak ? "Break finished" : "Session complete 🎯"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                  {isBreak
                    ? "Ready to focus again?"
                    : `${sessionCount} session${sessionCount !== 1 ? "s" : ""} today · what next?`}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {isBreak ? (
                  <ActionBtn onClick={skipToStudy} accent>Start focus</ActionBtn>
                ) : (
                  <>
                    <ActionBtn onClick={() => startBreak(suggestedBreak)}>
                      {suggestedBreak === "long" ? "Long break" : "Short break"}
                    </ActionBtn>
                    <ActionBtn onClick={start} accent>Next session</ActionBtn>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Keyboard hint strip ── */}
        <div style={{
          display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap",
          padding: "8px 16px",
          borderTop: "1px solid var(--line-soft)",
          background: "var(--surface-2)",
          fontSize: 10.5, color: "var(--ink-3)",
        }}>
          {[["Space", "play / pause"], ["R", "reset"], ["S", "start"], ["Esc", "close"]].map(([k, h]) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <kbd className="mono" style={{
                padding: "1px 5px", borderRadius: 3,
                background: "var(--surface)", border: "1px solid var(--line)",
                fontSize: 10, color: "var(--ink-2)", fontStyle: "normal",
              }}>{k}</kbd>
              {h}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Small helper components ───────────────────────────────────────────────────
function CtrlBtn({ children, onClick, ...rest }) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        width: 40, height: 40, borderRadius: 10,
        border: "1px solid var(--line)", background: "var(--surface)",
        color: "var(--ink-3)", display: "grid", placeItems: "center",
        transition: "all 120ms",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background     = "var(--surface-2)";
        e.currentTarget.style.color          = "var(--ink)";
        e.currentTarget.style.borderColor    = "var(--line-strong)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background     = "var(--surface)";
        e.currentTarget.style.color          = "var(--ink-3)";
        e.currentTarget.style.borderColor    = "var(--line)";
      }}
    >
      {children}
    </button>
  );
}

function ActionBtn({ children, onClick, accent }) {
  const bg = accent ? "var(--accent)" : "var(--surface)";
  const c  = accent ? "var(--on-accent)" : "var(--ink-2)";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 8,
        background: bg, color: c,
        border: accent ? "none" : "1px solid var(--line)",
        fontSize: "var(--fs-13)", fontWeight: 500,
        transition: "filter 120ms",
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(0.93)"; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ""; }}
    >
      {children}
    </button>
  );
}

// ── SVG icons (inline, no dependency) ────────────────────────────────────────
const PlaySvg  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z"/></svg>;
const PauseSvg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/></svg>;
const CheckSvg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>;
const ResetSvg = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
const SkipSvg  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="5,3 19,12 5,21"/><line x1="19" y1="4" x2="19" y2="20"/></svg>;
