import React, { useState, useEffect, useRef, useContext, createContext } from "react";
import { useTimer } from "./StudyTimer.jsx";

// ── Storage keys ─────────────────────────────────────────────────────────────
const LS_SESSIONS = "ll-analytics-sessions-v1";
const LS_RECALL   = "ll-analytics-recall-v1";
const LS_AI       = "ll-analytics-ai-v1";

// ── Pure utilities ────────────────────────────────────────────────────────────
function toDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekBounds(d = new Date()) {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = base.getDay();
  const offset = dow === 0 ? -6 : 1 - dow; // shift anchor to Monday
  const mon = new Date(base); mon.setDate(mon.getDate() + offset);
  const sun = new Date(mon);  sun.setDate(sun.getDate() + 7);
  return { start: mon.getTime(), end: sun.getTime() };
}

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function fmtFocusSecs(secs) {
  if (secs <= 0)  return "0m";
  if (secs < 60)  return "<1m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calcStreak(sessions, now = new Date(), threshold = 20 * 60) {
  const dayMap = {};
  for (const s of sessions) {
    if (s.mode !== "study") continue;
    dayMap[s.date] = (dayMap[s.date] || 0) + s.durationSecs;
  }
  let streak = 0;
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // If today hasn't crossed threshold yet, start counting from yesterday
  if ((dayMap[toDateStr(d)] || 0) < threshold) d.setDate(d.getDate() - 1);
  while ((dayMap[toDateStr(d)] || 0) >= threshold) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function calcLongestStreak(sessions, threshold = 20 * 60) {
  const dayMap = {};
  for (const s of sessions) {
    if (s.mode !== "study") continue;
    dayMap[s.date] = (dayMap[s.date] || 0) + s.durationSecs;
  }
  const days = Object.entries(dayMap)
    .filter(([, v]) => v >= threshold)
    .map(([k]) => k)
    .sort();
  let longest = 0, cur = 0;
  for (let i = 0; i < days.length; i++) {
    cur = i > 0 && (new Date(days[i]) - new Date(days[i - 1])) / 86400000 === 1 ? cur + 1 : 1;
    if (cur > longest) longest = cur;
  }
  return longest;
}

// ── emitAIActivity — fire-and-forget, callable from anywhere ─────────────────
// Components don't need context access to emit; AnalyticsProvider listens via CustomEvent.
export function emitAIActivity({ type, label, subj = null, status = "processing" }) {
  window.dispatchEvent(new CustomEvent("ll-ai-activity", {
    detail: { id: Math.random().toString(36).slice(2), ts: Date.now(), type, label, subj, status },
  }));
}

// ── Context ───────────────────────────────────────────────────────────────────
const AnalyticsCtx = createContext(null);
export function useAnalytics() { return useContext(AnalyticsCtx); }

// ── TimerWatcher — null component that bridges timer context → analytics ──────
// Must live inside AnalyticsProvider (which is inside TimerProvider) so useTimer() resolves.
function TimerWatcher({ onSessionComplete }) {
  const timer = useTimer();
  const prevStatus = useRef(null);

  useEffect(() => {
    if (!timer) return;
    const prev = prevStatus.current;
    const curr = timer.status;
    if (prev === "running" && curr === "completed" && !timer.isBreak) {
      onSessionComplete(timer.totalSecs);
      emitAIActivity({ type: "session", label: "Focus session completed ✓", status: "done" });
    }
    prevStatus.current = curr;
  }, [timer?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AnalyticsProvider({ children }) {
  const [sessions,   setSessions]   = useState(() => loadJSON(LS_SESSIONS, []));
  const [recallEvts, setRecallEvts] = useState(() => loadJSON(LS_RECALL, []));
  const [aiEvents,   setAiEvents]   = useState(() => loadJSON(LS_AI, []));
  const [now, setNow]               = useState(() => new Date());

  // Re-evaluate streak / week boundaries every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Persist on every change
  useEffect(() => { saveJSON(LS_SESSIONS, sessions); },   [sessions]);
  useEffect(() => { saveJSON(LS_RECALL,   recallEvts); }, [recallEvts]);
  useEffect(() => { saveJSON(LS_AI,       aiEvents.slice(0, 30)); }, [aiEvents]);

  // Listen for emitAIActivity() CustomEvents from anywhere in the app
  useEffect(() => {
    const onEvent = (e) => setAiEvents(prev => [e.detail, ...prev].slice(0, 30));
    window.addEventListener("ll-ai-activity", onEvent);
    return () => window.removeEventListener("ll-ai-activity", onEvent);
  }, []);

  // ── Computed: focus this week ─────────────────────────────────────────────
  const { start: wkStart, end: wkEnd } = getWeekBounds(now);
  const { start: pwStart, end: pwEnd } = getWeekBounds(new Date(wkStart - 1000));

  const thisWkSessions = sessions.filter(s => s.mode === "study" && s.endedAt >= wkStart && s.endedAt < wkEnd);
  const prevWkSessions = sessions.filter(s => s.mode === "study" && s.endedAt >= pwStart  && s.endedAt < pwEnd);

  const weekFocusSecs     = thisWkSessions.reduce((a, s) => a + s.durationSecs, 0);
  const prevWeekFocusSecs = prevWkSessions.reduce((a, s) => a + s.durationSecs, 0);

  // Per-day seconds Mon–Sun for sparkline
  const weekDailySecs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(wkStart);
    d.setDate(d.getDate() + i);
    const ds = toDateStr(d);
    return thisWkSessions.filter(s => s.date === ds).reduce((a, s) => a + s.durationSecs, 0);
  });

  const weekFocusLabel = fmtFocusSecs(weekFocusSecs);
  let weekDeltaLabel = "no sessions yet", weekDeltaTone = "ok";
  if (weekFocusSecs > 0 && prevWeekFocusSecs === 0) {
    weekDeltaLabel = "first week — keep going";
  } else if (prevWeekFocusSecs > 0) {
    const pct = Math.round(((weekFocusSecs - prevWeekFocusSecs) / prevWeekFocusSecs) * 100);
    weekDeltaLabel = `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last week`;
    weekDeltaTone  = pct >= 0 ? "ok" : "warn";
  }

  // ── Computed: streak ──────────────────────────────────────────────────────
  const streak        = calcStreak(sessions, now);
  const longestStreak = calcLongestStreak(sessions);

  // ── Computed: recall avg ──────────────────────────────────────────────────
  const cutoff7d     = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const recentRecall = recallEvts.filter(e => e.ts >= cutoff7d);
  const recallAvg    = recentRecall.length === 0
    ? null
    : Math.round(recentRecall.reduce((a, e) => a + e.score, 0) / recentRecall.length);

  const recallTrend = (() => {
    if (recentRecall.length < 2) return "take a quiz to build history";
    const mid  = Math.ceil(recentRecall.length / 2);
    const rAvg = recentRecall.slice(0, mid).reduce((a, e) => a + e.score, 0) / mid;
    const oAvg = recentRecall.slice(mid).reduce((a, e) => a + e.score, 0) / (recentRecall.length - mid);
    if (rAvg > oAvg + 3) return "↑ improving";
    if (rAvg < oAvg - 3) return "↓ review harder topics";
    return "→ holding steady";
  })();
  const recallTone = recallTrend.startsWith("↑") ? "ok" : recallTrend.startsWith("↓") ? "warn" : "ok";

  const latestAI = aiEvents[0] || null;

  // ── Actions ───────────────────────────────────────────────────────────────
  function recordSession(durationSecs, mode = "study") {
    setSessions(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      date: toDateStr(),
      startedAt: Date.now() - durationSecs * 1000,
      endedAt: Date.now(),
      durationSecs,
      mode,
    }]);
  }

  function recordQuizResult({ subj = null, score, total }) {
    setRecallEvts(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      ts: Date.now(),
      date: toDateStr(),
      subj,
      type: "quiz",
      score: Math.round((score / Math.max(total, 1)) * 100),
    }]);
  }

  const weekSessionCount = thisWkSessions.length;

  const value = {
    sessions, recallEvts,
    weekFocusSecs, weekFocusLabel, weekDeltaLabel, weekDeltaTone, weekDailySecs,
    weekSessionCount,
    streak, longestStreak,
    recallAvg, recallTrend, recallTone,
    aiEvents, latestAI,
    recordSession, recordQuizResult,
  };

  return (
    <AnalyticsCtx.Provider value={value}>
      <TimerWatcher onSessionComplete={recordSession} />
      {children}
    </AnalyticsCtx.Provider>
  );
}
