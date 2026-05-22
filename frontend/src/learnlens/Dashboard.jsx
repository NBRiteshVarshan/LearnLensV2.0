import React, { useState, useEffect, useRef } from "react";
import { useAppData } from "./data.js";
import { Card, Pill, Btn, SectionTitle, Ic, SUBJECT_ICONS, getCustomColorVars } from "./Shell.jsx";
import { useTimer, ProgressRing, fmtTimer } from "./StudyTimer.jsx";
import { useAnalytics } from "./useStudyAnalytics.jsx";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function greeting(h) {
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Late tonight";
}

const FMT_DATE = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const FMT_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function Dashboard({ setRoute, workflow, onAddSubject }) {
  const d = useAppData();
  if (!d.demo && d.subjects.length === 0) {
    return <EmptyDashboard user={d.user} onAddSubject={onAddSubject} setRoute={setRoute} />;
  }
  return <LiveDashboard data={d} setRoute={setRoute} workflow={workflow} onAddSubject={onAddSubject} />;
}

function EmptyDashboard({ user, onAddSubject, setRoute }) {
  const now = useNow(1000);
  const analytics = useAnalytics();
  const u = user;

  const previewRows = [
    {
      label: "Focus this week",
      value: analytics?.weekFocusSecs > 0 ? analytics.weekFocusLabel : "—",
      sub:   analytics?.weekFocusSecs > 0 ? analytics.weekDeltaLabel : "rolls up your sessions",
    },
    {
      label: "Current streak",
      value: analytics?.streak > 0 ? `${analytics.streak} d` : "0 d",
      sub:   analytics?.streak > 0
        ? `best: ${analytics.longestStreak} d`
        : "extends every study day",
    },
    {
      label: "Recall avg",
      value: analytics?.recallAvg != null ? `${analytics.recallAvg}%` : "—",
      sub:   analytics?.recallAvg != null ? analytics.recallTrend : "from flashcards + quizzes",
    },
    {
      label: "Real-time AI",
      value: analytics?.latestAI?.label || "—",
      sub:   "what the AI is processing",
    },
  ];

  return (
    <div style={{ padding: "40px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div className="label-xs" style={{ marginBottom: 8 }}>
          {FMT_DATE.format(now)} <span className="mono" style={{ color: "var(--ink-4)" }}>· {FMT_TIME.format(now)}</span>
        </div>
        <h1 style={{
          fontFamily: "var(--font-serif)", fontWeight: 400,
          fontSize: "var(--fs-36)", letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 12,
        }}>
          Welcome to LearnLens, <span style={{ color: "var(--accent)" }}>{u.name.split(" ")[0]}</span>.
        </h1>
        <p style={{ color: "var(--ink-2)", fontSize: "var(--fs-15)", maxWidth: 580 }}>
          Your dashboard updates in real time as you study. Start by adding a subject — then
          upload your notes and let the AI tools index, summarise, and quiz you on them.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
        <OnboardCard n={1} title="Add a subject" hint="Mathematics, programming, biology — anything you're studying."
          cta="Add subject" onClick={onAddSubject} active />
        <OnboardCard n={2} title="Upload your notes" hint="PDFs, lecture slides, textbook chapters. We chunk + index them."
          cta="Open AI Tools" onClick={() => setRoute({ view: "aitools" })} />
        <OnboardCard n={3} title="Ask, summarise, quiz" hint="The dashboard fills in with live activity as you work."
          cta="Browse calendar" onClick={() => setRoute({ view: "calendar" })} />
      </div>

      <Card padded={false}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div className="label-xs">Live study state</div>
            <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Your analytics — always real</div>
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 10.5, color: "var(--ok)", fontWeight: 500,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)",
              animation: "ll-pulse-soft 1.6s infinite" }} />
            live
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {previewRows.map((row, i) => (
            <div key={i} style={{
              padding: "16px 18px", borderRight: i < 3 ? "1px solid var(--line-soft)" : "none",
            }}>
              <div className="label-xs" style={{ marginBottom: 4 }}>{row.label}</div>
              <div style={{
                fontFamily: "var(--font-serif)", fontSize: 24, marginBottom: 2,
                color: row.value === "—" ? "var(--ink-3)" : "var(--ink)",
              }}>{row.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{row.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: 22, fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>
        Tip — flip on <span className="mono" style={{
          padding: "1px 6px", borderRadius: 3, background: "var(--surface-2)", color: "var(--ink-2)",
        }}>Demo data</span> in the Tweaks panel to see a populated example.
      </div>
    </div>
  );
}

function OnboardCard({ n, title, hint, cta, onClick, active }) {
  return (
    <Card style={{ padding: 0, position: "relative", overflow: "hidden",
      borderColor: active ? "var(--accent-line)" : "var(--line)" }}>
      {active && <div style={{ position: "absolute", inset: 0, background: "var(--accent-soft)", opacity: 0.4, pointerEvents: "none" }} />}
      <div style={{ position: "relative", padding: "18px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: active ? "var(--accent)" : "var(--surface-2)",
            color: active ? "var(--on-accent)" : "var(--ink-2)",
            display: "grid", placeItems: "center",
            fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)",
          }}>{n}</span>
          <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, letterSpacing: "-0.01em" }}>{title}</div>
        </div>
        <p style={{ fontSize: "var(--fs-13)", color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
          {hint}
        </p>
        <Btn variant={active ? "accent" : "default"} icon={active ? Ic.Plus : Ic.Chev} onClick={onClick}>{cta}</Btn>
      </div>
    </Card>
  );
}

function LiveDashboard({ data, setRoute, workflow, onAddSubject }) {
  const now = useNow(1000);
  const analytics = useAnalytics();
  const u = data.user;
  const wlabel = ({ study: "deep study", rev: "revision", exam: "exam prep", quick: "quick practice" })[workflow];
  const dueCount = data.todayTasks.filter(t => !t.done).length;
  const scheduledMin = data.todayTasks.reduce((acc, t) => acc + parseInt(t.est) || 0, 0);

  // Subject names for "coming due" delta
  const dueSubjNames = (() => {
    const ids = [...new Set(data.todayTasks.filter(t => !t.done).map(t => t.subj))].slice(0, 3);
    return ids.map(id => data.subjects.find(x => x.id === id)?.name || id).join(" · ") || "nothing due";
  })();

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 24 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            {FMT_DATE.format(now)}
            <span style={{ color: "var(--ink-4)" }}>·</span>
            <span className="mono tabular" style={{ color: "var(--ink-2)" }}>{FMT_TIME.format(now)}</span>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "1px 6px", borderRadius: 100,
              background: "var(--ok-soft)", color: "var(--ok)", border: "1px solid color-mix(in oklch, var(--ok) 30%, var(--line))",
              fontSize: 10, fontWeight: 500, textTransform: "none", letterSpacing: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ok)",
                animation: "ll-pulse-soft 1.6s infinite" }} />
              live
            </span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontWeight: 400,
            fontSize: "var(--fs-36)", letterSpacing: "-0.02em",
            lineHeight: 1.1, marginBottom: 10,
          }}>
            {greeting(now.getHours())}, {u.name.split(" ")[0]}.
          </h1>
          <p style={{ color: "var(--ink-2)", fontSize: "var(--fs-15)", maxWidth: 620 }}>
            {dueCount > 0 ? (
              <>
                You have <b style={{ color: "var(--ink)" }}>{dueCount} active task{dueCount === 1 ? "" : "s"}</b> and{" "}
                <b style={{ color: "var(--ink)" }}>{Math.floor(scheduledMin / 60)}h {scheduledMin % 60}m</b> of scheduled study.{" "}
              </>
            ) : (
              <>Nothing due today — a clean slate.{" "}</>
            )}
            Continuing in <span style={{ color: "var(--accent)", fontWeight: 500 }}>{wlabel}</span> mode.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon={Ic.Timer} variant="default">Start 25-min focus</Btn>
          <Btn icon={Ic.Plus} variant="primary">New session</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 22 }}>
        <StatCell
          kicker="Focus this week"
          big={analytics?.weekFocusLabel || "—"}
          delta={analytics?.weekDeltaLabel || "rolls up your sessions"}
          deltaTone={analytics?.weekDeltaTone || "ok"}
          spark={analytics?.weekFocusSecs > 0 ? analytics.weekDailySecs.map(s => s / 3600) : undefined}
        />
        <StatCell
          kicker="Current streak"
          big={analytics ? `${analytics.streak} d` : "0 d"}
          delta={analytics?.streak > 0 ? `best: ${analytics.longestStreak} d` : "extends every study day"}
          deltaTone="ok"
          icon={Ic.Flame}
        />
        <StatCell
          kicker="Recall (7d avg)"
          big={analytics?.recallAvg != null ? `${analytics.recallAvg}%` : "—"}
          delta={analytics?.recallTrend || "quiz to build history"}
          deltaTone={analytics?.recallTone || "ok"}
        />
        <StatCell
          kicker="Coming due"
          big={`${dueCount} item${dueCount === 1 ? "" : "s"}`}
          delta={dueSubjNames}
          deltaTone={dueCount > 0 ? "due" : "ok"}
        />
        <LiveAICell />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
        <RealtimeAnalysisCard now={now} aiActivity={data.aiActivity} isDemoMode={data.demo} />
        <FocusSessionCard workflow={workflow} />
      </div>

      <SectionTitle
        kicker="Workspaces" title="Your subjects"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>{data.subjects.length} active</span>
            <Btn icon={Ic.Filter} variant="ghost">Sort</Btn>
            <Btn icon={Ic.Plus} onClick={onAddSubject}>Add subject</Btn>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        {data.subjects.map(s => <SubjectCard key={s.id} s={s} onOpen={() => setRoute({ view: "subject", id: s.id })} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card padded={false}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", borderBottom: "1px solid var(--line)",
          }}>
            <div>
              <div className="label-xs">Today · {now.getDate()} {FMT_DATE.format(now).split(" ")[2]}</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Plan & tasks</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Pill tone="accent">{data.todayTasks.length} tasks</Pill>
              <Pill tone="due">{dueCount} due</Pill>
            </div>
          </div>
          <TaskList tasks={data.todayTasks} subjects={data.subjects} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padded={false}>
            <div style={{ padding: "14px 18px 8px" }}>
              <div className="label-xs">Focus this week</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Hours by subject</div>
            </div>
            <FocusChart weekFocus={data.weekFocus} />
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10, padding: "0 18px 16px",
              fontSize: 11, color: "var(--ink-3)",
            }}>
              {data.subjects.slice(0, 6).map(s => (
                <span key={s.id} data-subject={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--s)" }} />
                  {s.name}
                </span>
              ))}
            </div>
          </Card>
          <Card padded={false}>
            <div style={{ padding: "14px 18px 4px" }}>
              <div className="label-xs">Activity</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Recent</div>
            </div>
            <ActivityStream activity={data.activity} subjects={data.subjects} />
          </Card>
        </div>
      </div>
    </div>
  );
}

const AI_TYPE_META = {
  upload:  { c: "var(--ink-2)",  l: "UPLOAD" },
  embed:   { c: "var(--accent)", l: "INGEST" },
  ask:     { c: "var(--ok)",     l: "ASK"    },
  quiz:    { c: "var(--warn)",   l: "QUIZ"   },
  summary: { c: "var(--ink-2)",  l: "SUM"    },
  session: { c: "var(--accent)", l: "FOCUS"  },
  // demo shapes
  weak:    { c: "var(--due)",    l: "WEAK"   },
  answer:  { c: "var(--ok)",     l: "ASK"    },
};

function RealtimeAnalysisCard({ now, aiActivity, isDemoMode }) {
  const analytics = useAnalytics();

  const header = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: "1px solid var(--line)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: "var(--accent-soft)", color: "var(--accent)",
          display: "grid", placeItems: "center",
        }}>
          <span style={{ width: 14, height: 14 }}><Ic.Bot /></span>
        </span>
        <div>
          <div className="label-xs">Real-time AI analysis</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {isDemoMode ? "Personalised — what the AI saw today" : "Live AI activity feed"}
          </div>
        </div>
      </div>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 10.5, color: "var(--ok)", fontWeight: 500,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ok)",
          animation: "ll-pulse-soft 1.4s infinite" }} />
        live · streaming
      </span>
    </div>
  );

  // Demo mode: render the pre-baked demo events
  if (isDemoMode && aiActivity?.length > 0) {
    const fmtDemoRel = (mins) => {
      const m = -mins;
      if (m < 1) return "just now";
      if (m < 60) return `${m}m ago`;
      return `${Math.floor(m / 60)}h ago`;
    };
    return (
      <Card padded={false}>
        {header}
        <div style={{ padding: "6px 0 4px" }}>
          {aiActivity.map((a, i) => {
            const m = AI_TYPE_META[a.kind] || { c: "var(--ink-3)", l: "AI" };
            return (
              <div key={i} data-subject={a.subj} style={{
                display: "grid", gridTemplateColumns: "64px 1fr auto",
                gap: 12, padding: "9px 18px", alignItems: "center",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}>
                <span className="mono" style={{
                  fontSize: 10, color: m.c, fontWeight: 600,
                  padding: "1.5px 6px", borderRadius: 3,
                  background: `color-mix(in oklch, ${m.c} 12%, transparent)`,
                  width: "fit-content",
                }}>{m.l}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-13)", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }} className="mono">{a.meta}</div>
                </div>
                <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{fmtDemoRel(a.t)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // Real mode: analytics events
  const liveEvents = analytics?.aiEvents || [];
  const fmtRel = (ts) => {
    const secs = (Date.now() - ts) / 1000;
    if (secs < 10) return "just now";
    const m = Math.floor(secs / 60);
    return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
  };

  return (
    <Card padded={false}>
      {header}
      <div style={{ padding: "6px 0 4px" }}>
        {liveEvents.length === 0 ? (
          <div style={{
            padding: "28px 18px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 8,
              background: "var(--surface-2)", color: "var(--ink-4)",
              display: "grid", placeItems: "center",
            }}><span style={{ width: 18, height: 18 }}><Ic.Bot /></span></span>
            <div style={{ fontSize: "var(--fs-14)", color: "var(--ink-2)", fontWeight: 500 }}>No activity yet</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", maxWidth: 280, lineHeight: 1.6 }}>
              Complete a focus session, upload notes, or run a query — events will appear here in real time.
            </div>
          </div>
        ) : (
          liveEvents.map((a, i) => {
            const m = AI_TYPE_META[a.type] || { c: "var(--ink-3)", l: (a.type || "AI").toUpperCase().slice(0, 6) };
            const isProcessing = a.status === "processing";
            return (
              <div key={a.id || i} style={{
                display: "grid", gridTemplateColumns: "64px 1fr auto",
                gap: 12, padding: "9px 18px", alignItems: "center",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                background: i === 0 && isProcessing ? "color-mix(in oklch, var(--accent-soft) 40%, transparent)" : "transparent",
                transition: "background 400ms",
              }}>
                <span className="mono" style={{
                  fontSize: 10, color: m.c, fontWeight: 600,
                  padding: "1.5px 6px", borderRadius: 3,
                  background: `color-mix(in oklch, ${m.c} 12%, transparent)`,
                  width: "fit-content", display: "flex", alignItems: "center", gap: 4,
                }}>
                  {isProcessing && i === 0 && (
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.c,
                      animation: "ll-pulse-soft 1.2s infinite", display: "inline-block" }} />
                  )}
                  {m.l}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fs-13)", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.label}
                  </div>
                  {a.subj && (
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }} className="mono">{a.subj}</div>
                  )}
                </div>
                <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{fmtRel(a.ts)}</span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// FocusSessionCard reads from the shared timer context so it stays in sync
// with the top-bar pill and the floating panel — no duplicate state.
function FocusSessionCard({ workflow }) {
  const t = useTimer();

  const wMeta = {
    study: { label: "Deep study", target: 25, hint: "Reading-first, long sessions" },
    rev:   { label: "Revision",   target: 25, hint: "Recall + summaries" },
    exam:  { label: "Exam prep",  target: 25, hint: "PYQ drills + timer" },
    quick: { label: "Quick",      target: 25, hint: "10-min sprint" },
  }[workflow] || { label: "Focus", target: 25, hint: "" };

  if (!t) return null;

  const { status, displaySecs, progress, isBreak, start, pause, reset } = t;
  const isRunning   = status === "running";
  const isCompleted = status === "completed";
  const accentColor = isBreak || isCompleted ? "var(--ok)" : "var(--accent)";

  return (
    <Card padded={false}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="label-xs">Focus session</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>
            {wMeta.label} · {wMeta.target}m
          </div>
        </div>
        {isRunning && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 8px", borderRadius: 100,
            background: "var(--accent-soft)", color: "var(--accent)",
            border: "1px solid var(--accent-line)",
            fontSize: 10.5, fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)",
              animation: "ll-pulse-soft 1.4s infinite" }} />
            running
          </span>
        )}
      </div>
      <div style={{ padding: "20px 18px 16px", textAlign: "center" }}>
        <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 8px" }}>
          <ProgressRing
            progress={progress}
            size={140}
            strokeWidth={4}
            isRunning={isRunning}
            isCompleted={isCompleted}
            isBreak={isBreak}
          />
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div>
              <div
                className="mono tabular"
                style={{
                  fontFamily: "var(--font-serif)", fontSize: 32,
                  lineHeight: 1, fontVariantNumeric: "tabular-nums",
                  color: isCompleted ? "var(--ok)" : "var(--ink)",
                  animation: isRunning ? "ll-breathe 4s ease-in-out infinite" : "none",
                }}
                aria-live="polite"
              >
                {fmtTimer(displaySecs)}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2,
                textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {status === "idle"      ? "ready"    : ""}
                {status === "running"   ? (isBreak ? "break" : "focused") : ""}
                {status === "paused"    ? "paused"   : ""}
                {status === "completed" ? "done ✓"   : ""}
              </div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12 }}>{wMeta.hint}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          <Btn
            variant={isRunning ? "default" : "primary"}
            icon={Ic.Timer}
            onClick={isRunning ? pause : start}
            style={isRunning ? {} : { background: accentColor, borderColor: accentColor, color: "white" }}
          >
            {isRunning ? "Pause" : isCompleted ? "Restart" : "Start"}
          </Btn>
          <Btn variant="ghost" onClick={reset}>Reset</Btn>
        </div>
      </div>
    </Card>
  );
}

const AI_FOCUS_MSGS = [
  "monitoring focus",
  "analysing session",
  "tracking progress",
  "in focus mode",
];

function LiveAICell() {
  const [tick, setTick] = useState(0);
  const timer     = useTimer();
  const analytics = useAnalytics();

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const timerStatus = timer?.status || "idle";
  const isRunning   = timerStatus === "running";
  const isBreak     = timer?.isBreak;
  const latestAI    = analytics?.latestAI;
  const isRecentAI  = latestAI && (Date.now() - latestAI.ts < 15_000);
  const isProcessing = isRecentAI && latestAI?.status === "processing";

  const headline = (() => {
    if (isRecentAI)                return latestAI.label;
    if (timerStatus === "completed") return isBreak ? "break done ✓" : "session done ✓";
    if (timerStatus === "running")   return isBreak ? "break mode" : AI_FOCUS_MSGS[tick % AI_FOCUS_MSGS.length];
    if (timerStatus === "paused")    return "session paused";
    return "AI standing by";
  })();

  const dotColor = isProcessing
    ? "var(--warn)"
    : isRunning && !isBreak ? "var(--accent)"
    : isBreak ? "var(--ok)"
    : "var(--accent)";

  const bgGrad = isProcessing
    ? "linear-gradient(135deg, var(--warn-soft), transparent)"
    : isRunning && !isBreak ? "linear-gradient(135deg, var(--accent-soft), transparent)"
    : isBreak ? "linear-gradient(135deg, var(--ok-soft), transparent)"
    : "linear-gradient(135deg, var(--accent-soft), transparent)";

  const subText = (() => {
    if (isProcessing) return "processing…";
    if (isRecentAI && latestAI?.status === "done") return "done ✓";
    if (isRunning && !isBreak) return `session ${String((timer?.sessionCount || 0) + 1).padStart(2, "0")} · live`;
    const wk = analytics?.weekFocusLabel;
    return wk && wk !== "0m" ? `${wk} this week` : "start a session";
  })();

  const shouldAnimate = isProcessing || (isRunning && !isBreak);

  return (
    <Card style={{ padding: "14px 16px", background: bgGrad, transition: "background 400ms" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="label-xs" style={{ color: dotColor }}>
          {isProcessing ? "AI · processing" : isRunning ? "AI · active" : "AI · live"}
        </div>
        <span style={{
          width: 14, height: 14, color: dotColor,
          animation: isProcessing ? "ll-pulse-soft 1.4s infinite" : "none",
        }}><Ic.Bot /></span>
      </div>
      <div style={{
        fontFamily: "var(--font-serif)", fontWeight: 400,
        fontSize: 20, marginTop: 4, marginBottom: 6, letterSpacing: "-0.02em",
        color: "var(--ink)", transition: "color 300ms",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {headline}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }} className="mono">
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 4, height: 4, borderRadius: "50%", background: dotColor,
            opacity: shouldAnimate ? (((tick + i) % 3 === 0) ? 1 : 0.25) : 0.25,
            transition: "opacity 240ms",
          }} />
        ))}
        <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 6 }}>{subText}</span>
      </div>
    </Card>
  );
}

function StatCell({ kicker, big, delta, deltaTone = "ok", spark, icon: I }) {
  const tone = { ok: "var(--ok)", warn: "var(--warn)", due: "var(--due)" }[deltaTone];
  return (
    <Card style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="label-xs">{kicker}</div>
        {I && <span style={{ width: 14, height: 14, color: "var(--ink-3)" }}><I /></span>}
      </div>
      <div style={{
        fontFamily: "var(--font-serif)", fontWeight: 400,
        fontSize: 26, marginTop: 4, marginBottom: 6, letterSpacing: "-0.02em",
      }} className="tabular">
        {big}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 11, color: tone, fontWeight: 500 }}>{delta}</div>
        {spark && <Sparkline values={spark} />}
      </div>
    </Card>
  );
}

function Sparkline({ values }) {
  const w = 50, h = 16, max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - (values[values.length - 1] / max) * h} r="2" fill="var(--accent)" />
    </svg>
  );
}

function SubjectCard({ s, onOpen }) {
  const SI = SUBJECT_ICONS[s.id];
  const I  = SI || (s.icon && Ic[s.icon]) || null;
  const colorVars = !SI ? getCustomColorVars(s.color) : {};
  return (
    <button onClick={onOpen} data-subject={s.id} style={{
      textAlign: "left", padding: 0, background: "var(--surface)",
      border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
      overflow: "hidden", boxShadow: "var(--shadow-sm)",
      transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
      ...colorVars,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--s-line)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}>
      <div style={{
        position: "relative", padding: "18px 18px 0",
        borderBottom: "1px solid var(--line-soft)",
        background: "linear-gradient(180deg, color-mix(in oklch, var(--s-soft) 60%, transparent) 0%, transparent 100%)",
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--s)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 6, background: "var(--surface)",
              border: "1px solid var(--s-line)", display: "grid", placeItems: "center",
              color: "var(--s)",
            }}>{I && <span style={{ width: 15, height: 15 }}><I /></span>}</span>
            <div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{s.code} · {s.tag}</div>
              <div style={{ fontSize: "var(--fs-16)", fontWeight: 600, letterSpacing: "-0.01em" }}>{s.name}</div>
            </div>
          </div>
          <span className="mono tabular" style={{ fontSize: 11, color: "var(--s)" }}>{s.progress}%</span>
        </div>

        <div className="serif" style={{
          fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-15)",
          color: "var(--ink-2)", lineHeight: 1.35, marginBottom: 14, fontStyle: "italic",
        }}>
          {s.title}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${s.progress}%`, height: "100%", background: "var(--s)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--ink-3)" }}>
            <span>{s.unitDone} / {s.units} units</span>
            <span className="tabular">{s.resourceCount} resources</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 18px 14px" }}>
        <div className="label-xs" style={{ marginBottom: 6 }}>Next up</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>{s.next.kind}</div>
            <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, lineHeight: 1.35,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.next.title}
            </div>
          </div>
          <Pill tone={s.next.urgency}>{s.next.due}</Pill>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 18px", borderTop: "1px solid var(--line-soft)",
        background: "var(--surface-2)", fontSize: 11, color: "var(--ink-3)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, color: "var(--s)" }}><Ic.Flame /></span>
          {s.streak}-day streak · {s.hours}h logged
        </span>
        <span>{s.session}</span>
      </div>
    </button>
  );
}

function TaskList({ tasks: initial, subjects }) {
  const [tasks, setTasks] = useState(initial);
  const toggle = id => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));

  if (tasks.length === 0) {
    return (
      <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink-3)" }}>
        <div style={{ fontSize: "var(--fs-14)", marginBottom: 4 }}>No tasks yet.</div>
        <div style={{ fontSize: 11.5 }}>Tasks you add to subjects will show up here.</div>
      </div>
    );
  }

  return (
    <div>
      {tasks.map((t, i) => {
        const s = subjects.find(x => x.id === t.subj);
        const I = s ? SUBJECT_ICONS[t.subj] : null;
        return (
          <div key={t.id} data-subject={t.subj} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
            alignItems: "center", gap: 12, padding: "10px 18px",
            borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
            opacity: t.done ? 0.55 : 1,
          }}>
            <button onClick={() => toggle(t.id)} style={{
              width: 16, height: 16, borderRadius: 4,
              border: `1.5px solid ${t.done ? "var(--s)" : "var(--line-strong)"}`,
              background: t.done ? "var(--s)" : "transparent",
              display: "grid", placeItems: "center",
              color: t.done ? "var(--on-accent)" : "transparent",
            }}>
              <span style={{ width: 10, height: 10 }}><Ic.Check /></span>
            </button>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "var(--fs-14)", fontWeight: 500,
                textDecoration: t.done ? "line-through" : "none",
                color: t.done ? "var(--ink-3)" : "var(--ink)",
              }}>{t.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                {s && (
                  <>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--s)" }}>
                      <span style={{ width: 11, height: 11 }}>{I && <I />}</span>
                      {s.name}
                    </span>
                    <span>·</span>
                  </>
                )}
                <span>{t.kind}</span>
              </div>
            </div>
            <span className="mono tabular" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.est}</span>
            <span style={{ width: 18, display: "grid", placeItems: "center" }}>
              {t.priority === "high" && <span title="High" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--due)" }} />}
              {t.priority === "med"  && <span title="Med"  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warn)" }} />}
              {t.priority === "low"  && <span title="Low"  style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)" }} />}
            </span>
            <span className="mono tabular" style={{ fontSize: 11, color: t.due === "23:59" ? "var(--due)" : "var(--ink-3)", minWidth: 36, textAlign: "right" }}>
              {t.due}
            </span>
          </div>
        );
      })}
      <button style={{
        display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
        color: "var(--ink-3)", fontSize: "var(--fs-13)", borderTop: "1px solid var(--line-soft)",
        width: "100%",
      }}>
        <span style={{ width: 13, height: 13 }}><Ic.Plus /></span>
        Add task to today
      </button>
    </div>
  );
}

function FocusChart({ weekFocus }) {
  const max = 5;
  const subs = ["math", "prog", "bio", "lit", "phys", "chem"];
  const hasAny = weekFocus.some(d => subs.some(k => d[k] > 0));
  if (!hasAny) {
    return (
      <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
        No focus sessions logged yet.
      </div>
    );
  }
  return (
    <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "flex-end", gap: 10, height: 132 }}>
      {weekFocus.map((day, i) => {
        const total = subs.reduce((acc, k) => acc + (day[k] || 0), 0);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span className="mono tabular" style={{ fontSize: 10, color: "var(--ink-3)" }}>{total.toFixed(1)}h</span>
            <div style={{
              width: "100%", height: 88, display: "flex", flexDirection: "column-reverse",
              borderRadius: 4, overflow: "hidden", background: "var(--surface-2)",
            }}>
              {subs.map(k => {
                const v = day[k] || 0;
                if (!v) return null;
                return <div key={k} data-subject={k} style={{ height: `${(v / max) * 100}%`, background: "var(--s)" }} />;
              })}
            </div>
            <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 500 }}>{day.d}</span>
          </div>
        );
      })}
    </div>
  );
}

const ACT_ICONS = { note: Ic.Note, quiz: Ic.Quiz, anno: Ic.Bookmark, video: Ic.Video, card: Ic.Card, essay: Ic.Quill };

function ActivityStream({ activity, subjects }) {
  if (!activity || activity.length === 0) {
    return (
      <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
        Activity will appear here as you study.
      </div>
    );
  }
  return (
    <div style={{ padding: "4px 0 10px" }}>
      {activity.map((a, i) => {
        const s = subjects.find(x => x.id === a.subj);
        const I = ACT_ICONS[a.icon];
        return (
          <div key={i} data-subject={a.subj} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 18px",
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: "var(--s-soft)", color: "var(--s)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}><span style={{ width: 13, height: 13 }}>{I && <I />}</span></span>
            <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-2)", flex: 1, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.text}
            </div>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{a.t}</span>
          </div>
        );
      })}
    </div>
  );
}

export { Dashboard };
