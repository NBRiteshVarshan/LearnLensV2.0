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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {previewRows.map((row, i) => (
            <div key={i} style={{
              padding: "16px 18px", borderRight: i < 2 ? "1px solid var(--line-soft)" : "none",
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
  const wlabel = ({ study: "deep study", rev: "revision", exam: "exam prep" })[workflow] || "deep study";

  const [todoItems, setTodoItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ll-todo-v1") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    const refresh = () => {
      try { setTodoItems(JSON.parse(localStorage.getItem("ll-todo-v1") || "[]")); } catch {}
    };
    window.addEventListener("ll-todo-changed", refresh);
    return () => window.removeEventListener("ll-todo-changed", refresh);
  }, []);
  const dueCount = todoItems.filter(x => !x.done).length;

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
              <>You have <b style={{ color: "var(--ink)" }}>{dueCount} open task{dueCount === 1 ? "" : "s"}</b> in your to-do list.{" "}</>
            ) : (
              <>Nothing in your to-do list — a clean slate.{" "}</>
            )}
            Continuing in <span style={{ color: "var(--accent)", fontWeight: 500 }}>{wlabel}</span> mode.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
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
          delta={dueCount > 0 ? "from your to-do list" : "all clear"}
          deltaTone={dueCount > 0 ? "due" : "ok"}
        />
      </div>

      <div style={{ marginBottom: 24, maxWidth: 440 }}>
        <FocusSessionCard workflow={workflow} />
      </div>

      <SectionTitle
        kicker="Workspaces" title="Your subjects"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>{data.subjects.length} active</span>
            <Btn icon={Ic.Plus} onClick={onAddSubject}>Add subject</Btn>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        {data.subjects.map(s => <SubjectCard key={s.id} s={s} onOpen={() => setRoute({ view: "subject", id: s.id })} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <TodoList />

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padded={false}>
            <div style={{ padding: "14px 18px 8px" }}>
              <div className="label-xs">Focus this week</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Hours by day</div>
            </div>
            <WeekFocusChart />
          </Card>
          <Card padded={false}>
            <div style={{ padding: "14px 18px 4px" }}>
              <div className="label-xs">Activity</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Recent</div>
            </div>
            <RealActivityStream />
          </Card>
        </div>
      </div>
    </div>
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

function TodoList() {
  const LS_KEY = "ll-todo-v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
  const [items, setItems] = useState(load);
  const [input, setInput] = useState("");

  const save = (next) => {
    setItems(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("ll-todo-changed"));
    } catch {}
  };

  const add = () => {
    const t = input.trim();
    if (!t) return;
    save([...items, { id: Date.now(), text: t, done: false }]);
    setInput("");
  };

  const toggle = (id) => save(items.map(x => x.id === id ? { ...x, done: !x.done } : x));
  const remove = (id) => save(items.filter(x => x.id !== id));
  const doneCount = items.filter(x => x.done).length;

  const inputStyle = {
    flex: 1, padding: "8px 11px",
    border: "1px solid var(--line)", borderRadius: "var(--r)",
    fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)",
  };

  return (
    <Card padded={false}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid var(--line)",
      }}>
        <div>
          <div className="label-xs">To-Do list</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Tasks</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Pill tone="accent">{items.length} total</Pill>
          {doneCount > 0 && <Pill tone="ok">{doneCount} done</Pill>}
        </div>
      </div>

      <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add a task and press Enter…"
          style={inputStyle}
        />
        <Btn variant="primary" icon={Ic.Plus} onClick={add}>Add</Btn>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink-3)" }}>
          <div style={{ fontSize: "var(--fs-14)", marginBottom: 4 }}>No tasks yet.</div>
          <div style={{ fontSize: 11.5 }}>Type a task above and press Enter or Add.</div>
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {items.map((item, i) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              opacity: item.done ? 0.6 : 1, transition: "opacity 200ms",
            }}>
              <button onClick={() => toggle(item.id)} style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${item.done ? "var(--accent)" : "var(--line-strong)"}`,
                background: item.done ? "var(--accent)" : "transparent",
                display: "grid", placeItems: "center",
                color: item.done ? "white" : "transparent",
              }}>
                <span style={{ width: 10, height: 10 }}><Ic.Check /></span>
              </button>
              <div style={{
                flex: 1, fontSize: "var(--fs-14)", fontWeight: 500,
                textDecoration: item.done ? "line-through" : "none",
                color: item.done ? "var(--ink-3)" : "var(--ink)",
              }}>{item.text}</div>
              <button onClick={() => remove(item.id)} style={{
                width: 22, height: 22, borderRadius: "var(--r-sm)", color: "var(--ink-4)",
                display: "grid", placeItems: "center", fontSize: 16, lineHeight: 1,
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--due)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--ink-4)"}
              >×</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function WeekFocusChart() {
  const analytics = useAnalytics();
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
  const secs = analytics?.weekDailySecs || Array(7).fill(0);
  const hours = secs.map(s => s / 3600);
  const max = Math.max(...hours, 0.5);
  const hasAny = hours.some(h => h > 0);

  if (!hasAny) {
    return (
      <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
        No focus sessions logged yet. Complete a timer session to see data here.
      </div>
    );
  }
  return (
    <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "flex-end", gap: 10, height: 132 }}>
      {hours.map((h, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <span className="mono tabular" style={{ fontSize: 10, color: "var(--ink-3)" }}>
            {h > 0 ? `${h.toFixed(1)}h` : ""}
          </span>
          <div style={{
            width: "100%", height: 88, display: "flex", alignItems: "flex-end",
            borderRadius: 4, overflow: "hidden", background: "var(--surface-2)",
          }}>
            {h > 0 && (
              <div style={{ width: "100%", height: `${(h / max) * 100}%`, background: "var(--accent)", borderRadius: "2px 2px 0 0" }} />
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 500 }}>{DAY_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}

const REAL_ACT_META = {
  session: { I: Ic.Timer,  bg: "var(--accent-soft)", c: "var(--accent)" },
  upload:  { I: Ic.Upload, bg: "var(--surface-2)",   c: "var(--ink-2)" },
  embed:   { I: Ic.Bot,    bg: "var(--accent-soft)", c: "var(--accent)" },
  ask:     { I: Ic.Search, bg: "var(--ok-soft)",     c: "var(--ok)"    },
  summary: { I: Ic.Note,   bg: "var(--surface-2)",   c: "var(--ink-2)" },
  quiz:    { I: Ic.Quiz,   bg: "var(--warn-soft)",   c: "var(--warn)"  },
};

function RealActivityStream() {
  const analytics = useAnalytics();
  const events = analytics?.aiEvents || [];

  const fmtTime = (ts) => {
    const secs = (Date.now() - ts) / 1000;
    if (secs < 60) return "just now";
    const m = Math.floor(secs / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (events.length === 0) {
    return (
      <div style={{ padding: "24px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>
        Activity will appear here as you study.
      </div>
    );
  }
  return (
    <div style={{ padding: "4px 0 10px" }}>
      {events.slice(0, 8).map((a, i) => {
        const m = REAL_ACT_META[a.type] || { I: Ic.Bot, bg: "var(--surface-2)", c: "var(--ink-3)" };
        const IconComp = m.I;
        return (
          <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 18px" }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: m.bg, color: m.c,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}><span style={{ width: 13, height: 13 }}><IconComp /></span></span>
            <div style={{
              fontSize: "var(--fs-13)", color: "var(--ink-2)", flex: 1, minWidth: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{a.label}</div>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", flexShrink: 0 }}>
              {fmtTime(a.ts)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { Dashboard };
