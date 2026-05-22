import { useState, useEffect, useRef, useCallback } from "react";

// ── Mode registry ─────────────────────────────────────────────────────────────
export const MODES = {
  study: { label: "Deep study",   secs: 25 * 60, kind: "focus" },
  short: { label: "Short break",  secs:  5 * 60, kind: "break" },
  long:  { label: "Long break",   secs: 15 * 60, kind: "break" },
};

const STORAGE_KEY = "ll-timer-v1";

// ── Persistence helpers ───────────────────────────────────────────────────────
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function buildInitial() {
  const saved = loadSaved();
  if (!saved) return fresh("study");

  // If it was running, account for time that passed while the tab was closed
  if (saved.status === "running" && saved.startedAt) {
    const elapsed = (Date.now() - saved.startedAt) / 1000;
    const remaining = saved.snapSecs - elapsed;
    if (remaining <= 0) {
      // Session finished while the tab was away
      return {
        ...saved,
        status: "completed",
        startedAt: null,
        snapSecs: 0,
        sessionCount: saved.mode === "study" ? saved.sessionCount + 1 : saved.sessionCount,
        totalFocusSecs: saved.mode === "study"
          ? saved.totalFocusSecs + MODES.study.secs
          : saved.totalFocusSecs,
      };
    }
  }
  return saved;
}

function fresh(mode = "study") {
  return {
    mode,
    status: "idle",       // idle | running | paused | completed
    startedAt: null,      // Date.now() captured when the current run started
    snapSecs: MODES[mode].secs,  // seconds remaining at the moment of last start/pause
    sessionCount: 0,
    totalFocusSecs: 0,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useStudyTimer() {
  const [s, setS] = useState(buildInitial);

  // displaySecs is a separate piece of state updated 60fps via RAF when running.
  // Kept separate so the dashboard card re-renders at the right cadence without
  // forcing all context consumers to re-render every frame — they read status/
  // sessionCount/progress which only change on discrete events.
  const [displaySecs, setDisplaySecs] = useState(() => {
    const init = buildInitial();
    if (init.status === "running" && init.startedAt) {
      return Math.max(0, init.snapSecs - (Date.now() - init.startedAt) / 1000);
    }
    if (init.status === "completed") return 0;
    if (init.status === "paused")    return init.snapSecs;
    return MODES[init.mode].secs;
  });

  const rafRef = useRef(null);

  // ── RAF tick ────────────────────────────────────────────────────────────────
  // Runs only when status === "running". Uses timestamp math so accuracy is
  // preserved through tab switches and system sleep.
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    if (s.status === "running" && s.startedAt) {
      const tick = () => {
        const elapsed  = (Date.now() - s.startedAt) / 1000;
        const remaining = Math.max(0, s.snapSecs - elapsed);
        setDisplaySecs(remaining);

        if (remaining > 0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Timer reached zero — transition to completed
          setS(prev => ({
            ...prev,
            status: "completed",
            startedAt: null,
            snapSecs: 0,
            sessionCount:   prev.mode === "study" ? prev.sessionCount + 1 : prev.sessionCount,
            totalFocusSecs: prev.mode === "study" ? prev.totalFocusSecs + MODES.study.secs : prev.totalFocusSecs,
          }));
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      // Sync displaySecs to the discrete state
      if (s.status === "idle")       setDisplaySecs(MODES[s.mode].secs);
      if (s.status === "paused")     setDisplaySecs(s.snapSecs);
      if (s.status === "completed")  setDisplaySecs(0);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [s.status, s.startedAt, s.snapSecs, s.mode]);

  // ── Persist on every state change ───────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  }, [s]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    setS(prev => ({
      ...prev,
      status: "running",
      startedAt: Date.now(),
      snapSecs: (prev.status === "idle" || prev.status === "completed")
        ? MODES[prev.mode].secs
        : prev.snapSecs,
    }));
  }, []);

  const pause = useCallback(() => {
    setS(prev => {
      if (prev.status !== "running") return prev;
      const elapsed = (Date.now() - prev.startedAt) / 1000;
      return {
        ...prev,
        status: "paused",
        startedAt: null,
        snapSecs: Math.max(0, prev.snapSecs - elapsed),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setS(prev => ({
      ...prev,
      status: "idle",
      startedAt: null,
      snapSecs: MODES[prev.mode].secs,
    }));
  }, []);

  const setMode = useCallback((mode) => {
    setS(prev => ({
      ...prev,
      mode,
      status: "idle",
      startedAt: null,
      snapSecs: MODES[mode].secs,
    }));
  }, []);

  // Auto-start a break (called from the completion CTA)
  const startBreak = useCallback((type = "short") => {
    setS(prev => ({
      ...prev,
      mode: type,
      status: "running",
      startedAt: Date.now(),
      snapSecs: MODES[type].secs,
    }));
  }, []);

  // Skip back to study mode from a break
  const skipToStudy = useCallback(() => {
    setS(prev => ({
      ...prev,
      mode: "study",
      status: "idle",
      startedAt: null,
      snapSecs: MODES.study.secs,
    }));
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const isBreak   = MODES[s.mode].kind === "break";
  const totalSecs = MODES[s.mode].secs;
  const progress  = s.status === "idle"
    ? 0
    : Math.max(0, Math.min(1, 1 - displaySecs / totalSecs));

  return {
    mode:           s.mode,
    status:         s.status,
    displaySecs:    Math.ceil(displaySecs),
    progress,
    sessionCount:   s.sessionCount,
    totalFocusSecs: s.totalFocusSecs,
    isBreak,
    totalSecs,
    // actions
    start,
    pause,
    reset,
    setMode,
    startBreak,
    skipToStudy,
  };
}
