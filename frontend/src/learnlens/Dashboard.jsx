import React, { useState } from "react";
import { SUBJECTS, ACTIVITY, TODAY_TASKS, WEEK_FOCUS } from "./data.js";
import { Card, Pill, Btn, SectionTitle, Ic, SUBJECT_ICONS } from "./Shell.jsx";

function Dashboard({ setRoute, workflow }) {
  const today = new Date(2026, 4, 16); // May 16
  const wlabel = ({ study: "deep study", rev: "revision", exam: "exam prep", quick: "quick practice" })[workflow];

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Hero greeting */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 24 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 8 }}>
            Saturday · 16 May · Week 12 of Hilary term
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)", fontWeight: 400,
            fontSize: "var(--fs-36)", letterSpacing: "-0.02em",
            lineHeight: 1.1, marginBottom: 10,
          }}>
            Good afternoon, Eleanor.
          </h1>
          <p style={{ color: "var(--ink-2)", fontSize: "var(--fs-15)", maxWidth: 580 }}>
            You have <b style={{ color: "var(--ink)" }}>3 active tasks</b> due this week and{" "}
            <b style={{ color: "var(--ink)" }}>2h 40m</b> of scheduled study. Continuing in{" "}
            <span style={{ color: "var(--accent)", fontWeight: 500 }}>{wlabel}</span> mode.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon={Ic.Timer} variant="default">Start 25-min focus</Btn>
          <Btn icon={Ic.Plus} variant="primary">New session</Btn>
        </div>
      </div>

      {/* Quick-stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCell
          kicker="Focus this week"
          big="14h 22m"
          delta="+1h 40m vs last week"
          deltaTone="ok"
          spark={[1.4, 2.0, 0.6, 1.8, 0, 0.8, 1.2]}
        />
        <StatCell
          kicker="Current streak"
          big="12 days"
          delta="Personal best — keep it"
          deltaTone="ok"
          icon={Ic.Flame}
        />
        <StatCell
          kicker="Recall (7d avg)"
          big="84%"
          delta="−3% — weak: Krebs cycle"
          deltaTone="warn"
        />
        <StatCell
          kicker="Coming due"
          big="3 items"
          delta="Math · Lit · Phys"
          deltaTone="due"
        />
      </div>

      {/* Subject grid */}
      <SectionTitle
        kicker="Workspaces"
        title="Your subjects"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>{SUBJECTS.length} active</span>
            <Btn icon={Ic.Filter} variant="ghost">Sort</Btn>
            <Btn icon={Ic.Plus}>Add subject</Btn>
          </div>
        }
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 36 }}>
        {SUBJECTS.map(s => <SubjectCard key={s.id} s={s} onOpen={() => setRoute({ view: "subject", id: s.id })} />)}
      </div>

      {/* Two-column: Today + Activity & Focus chart */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card padded={false}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", borderBottom: "1px solid var(--line)",
          }}>
            <div>
              <div className="label-xs">Today · 16 May</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Plan & tasks</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Pill tone="accent">5 tasks</Pill>
              <Pill tone="due">1 due today</Pill>
            </div>
          </div>
          <TaskList />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padded={false}>
            <div style={{ padding: "14px 18px 8px" }}>
              <div className="label-xs">Focus this week</div>
              <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Hours by subject</div>
            </div>
            <FocusChart />
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10, padding: "0 18px 16px",
              fontSize: 11, color: "var(--ink-3)",
            }}>
              {SUBJECTS.slice(0, 6).map(s => (
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
            <ActivityStream />
          </Card>
        </div>
      </div>
    </div>
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
        fontSize: 28, marginTop: 4, marginBottom: 6, letterSpacing: "-0.02em",
      }} className="tabular">
        {big}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 11.5, color: tone, fontWeight: 500 }}>{delta}</div>
        {spark && <Sparkline values={spark} />}
      </div>
    </Card>
  );
}

function Sparkline({ values }) {
  const w = 60, h = 18, max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - (values[values.length - 1] / max) * h} r="2" fill="var(--accent)" />
    </svg>
  );
}

// ── Subject card ───────────────────────────────────────────────────────────
function SubjectCard({ s, onOpen }) {
  const I = SUBJECT_ICONS[s.id];
  return (
    <button onClick={onOpen} data-subject={s.id} style={{
      textAlign: "left", padding: 0, background: "var(--surface)",
      border: "1px solid var(--line)", borderRadius: "var(--r-lg)",
      overflow: "hidden", boxShadow: "var(--shadow-sm)",
      transition: "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--s-line)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = "none"; }}>
      {/* head — colored hairline + spine */}
      <div style={{
        position: "relative",
        padding: "18px 18px 0",
        borderBottom: `1px solid var(--line-soft)`,
        background: `linear-gradient(180deg, color-mix(in oklch, var(--s-soft) 60%, transparent) 0%, transparent 100%)`,
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--s)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{
              width: 28, height: 28, borderRadius: 6, background: "var(--surface)",
              border: "1px solid var(--s-line)", display: "grid", placeItems: "center",
              color: "var(--s)",
            }}><span style={{ width: 15, height: 15 }}><I /></span></span>
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

        {/* progress */}
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

      {/* next-up */}
      <div style={{ padding: "12px 18px 14px" }}>
        <div className="label-xs" style={{ marginBottom: 6 }}>Next up</div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>
              {s.next.kind}
            </div>
            <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, lineHeight: 1.35,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {s.next.title}
            </div>
          </div>
          <Pill tone={s.next.urgency}>{s.next.due}</Pill>
        </div>
      </div>

      {/* footer */}
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

// ── Task list ──────────────────────────────────────────────────────────────
function TaskList() {
  const [tasks, setTasks] = useState(TODAY_TASKS);
  const toggle = id => setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x));

  return (
    <div>
      {tasks.map((t, i) => {
        const s = SUBJECTS.find(x => x.id === t.subj);
        const I = SUBJECT_ICONS[t.subj];
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--s)" }}>
                  <span style={{ width: 11, height: 11 }}><I /></span>
                  {s.name}
                </span>
                <span>·</span>
                <span>{t.kind}</span>
              </div>
            </div>
            <span className="mono tabular" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t.est}</span>
            <span style={{ width: 18, display: "grid", placeItems: "center" }}>
              {t.priority === "high" && <span title="High" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--due)" }} />}
              {t.priority === "med"  && <span title="Med" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warn)" }} />}
              {t.priority === "low"  && <span title="Low" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink-4)" }} />}
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

// ── Focus chart (stacked bars) ─────────────────────────────────────────────
function FocusChart() {
  const max = 5; // hours
  const subs = ["math", "prog", "bio", "lit", "phys", "chem"];
  return (
    <div style={{ padding: "8px 18px 12px", display: "flex", alignItems: "flex-end", gap: 10, height: 132 }}>
      {WEEK_FOCUS.map((day, i) => {
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

// ── Activity stream ────────────────────────────────────────────────────────
const ACT_ICONS = { note: Ic.Note, quiz: Ic.Quiz, anno: Ic.Bookmark, video: Ic.Video, card: Ic.Card, essay: Ic.Quill };
function ActivityStream() {
  return (
    <div style={{ padding: "4px 0 10px" }}>
      {ACTIVITY.map((a, i) => {
        const s = SUBJECTS.find(x => x.id === a.subj);
        const I = ACT_ICONS[a.icon];
        return (
          <div key={i} data-subject={a.subj} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "8px 18px",
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: 6,
              background: "var(--s-soft)", color: "var(--s)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}><span style={{ width: 13, height: 13 }}><I /></span></span>
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

export {
  Dashboard,
};
