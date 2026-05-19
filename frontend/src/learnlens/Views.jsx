import React, { useState } from "react";
import { SUBJECTS } from "./data.js";
import { Card, Pill, Btn, SectionTitle, Ic, SUBJECT_ICONS } from "./Shell.jsx";

// ── Library ────────────────────────────────────────────────────────────────
const LIB_TYPES = [
  { id: "all",  label: "All", n: 552 },
  { id: "pdf",  label: "PDFs", n: 184, icon: Ic.Pdf },
  { id: "note", label: "Notes", n: 167, icon: Ic.Note },
  { id: "video",label: "Lectures", n: 84, icon: Ic.Video },
  { id: "code", label: "Code", n: 62, icon: Ic.Code },
  { id: "card", label: "Flashcards", n: 612, icon: Ic.Card },
  { id: "quiz", label: "Quizzes", n: 38, icon: Ic.Quiz },
];

const LIB_ITEMS = [
  { kind: "pdf",   subj: "math", title: "Spivak — Calculus, Ch. 7 (annotated)",  meta: "412 p · 38 highlights", t: "2h ago", tag: "Textbook", diff: "II" },
  { kind: "video", subj: "prog", title: "Lecture 13 — Red-black trees",          meta: "01:24:11 · watched 78%", t: "Yesterday", tag: "Lecture",  diff: "II" },
  { kind: "note",  subj: "bio",  title: "Membrane transport — lab notes",         meta: "8 pages · last edit 12 min ago", t: "Today", tag: "Notes", diff: "I" },
  { kind: "code",  subj: "prog", title: "rbtree.rs (lab fork)",                   meta: "247 LOC · 1 failing test", t: "08:42", tag: "Lab",     diff: "III" },
  { kind: "pdf",   subj: "lit",  title: "Mrs Dalloway — Hogarth 1925 (scan)",     meta: "180 p · 24 annotations", t: "Yesterday", tag: "Primary text", diff: "II" },
  { kind: "quiz",  subj: "math", title: "Sequences & limits — 25 Q",              meta: "Last attempt 22 / 25", t: "Mon", tag: "Quiz", diff: "II" },
  { kind: "card",  subj: "bio",  title: "Membrane transport — 28 cards",          meta: "87% recall · 6 weak", t: "Sun",   tag: "Deck", diff: "I" },
  { kind: "note",  subj: "phys", title: "Lagrangian derivations — set 4",         meta: "5 pages · scratch", t: "Sat", tag: "Working", diff: "III" },
  { kind: "pdf",   subj: "chem", title: "Functional groups primer",               meta: "16 p · 3 highlights", t: "Fri",   tag: "Primer", diff: "I" },
  { kind: "video", subj: "lit",  title: "Modernism — interior monologue",         meta: "47:02 · watched 100%", t: "Thu", tag: "Lecture", diff: "II" },
  { kind: "code",  subj: "prog", title: "amortized.md",                            meta: "Markdown · 1,840 words", t: "Wed", tag: "Notes", diff: "II" },
  { kind: "quiz",  subj: "bio",  title: "Cellular respiration — 20 Q",            meta: "Last attempt 15 / 20", t: "Wed", tag: "Quiz", diff: "II" },
];

const KIND_ICONS = { pdf: Ic.Pdf, video: Ic.Video, note: Ic.Note, code: Ic.Code, card: Ic.Card, quiz: Ic.Quiz };

function Library() {
  const [type, setType] = useState("all");
  const items = type === "all" ? LIB_ITEMS : LIB_ITEMS.filter(i => i.kind === type);

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 6 }}>Resource Library</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            Everything you've gathered
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon={Ic.Filter} variant="ghost">Filter</Btn>
          <Btn icon={Ic.Plus} variant="primary">Upload</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>
        {/* Type sidebar */}
        <div>
          <div className="label-xs" style={{ marginBottom: 8 }}>By type</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {LIB_TYPES.map(t => {
              const active = type === t.id;
              const I = t.icon;
              return (
                <button key={t.id} onClick={() => setType(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  borderRadius: "var(--r-sm)",
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-2)",
                  fontSize: "var(--fs-13)", fontWeight: active ? 500 : 400,
                }}>
                  {I ? <span style={{ width: 13, height: 13, color: active ? "var(--accent)" : "var(--ink-3)" }}><I /></span>
                     : <span style={{ width: 13 }} />}
                  <span style={{ flex: 1, textAlign: "left" }}>{t.label}</span>
                  <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{t.n}</span>
                </button>
              );
            })}
          </div>

          <div className="label-xs" style={{ marginTop: 22, marginBottom: 8 }}>By subject</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {SUBJECTS.map(s => {
              const I = SUBJECT_ICONS[s.id];
              return (
                <button key={s.id} data-subject={s.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  borderRadius: "var(--r-sm)", fontSize: "var(--fs-13)",
                  color: "var(--ink-2)",
                }}>
                  <span style={{ width: 12, height: 12, color: "var(--s)" }}><I /></span>
                  <span style={{ flex: 1, textAlign: "left" }}>{s.name}</span>
                  <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{s.resourceCount}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <Card padded={false}>
          <div style={{
            display: "grid", gridTemplateColumns: "1.6fr auto 100px 110px 80px",
            gap: 12, padding: "10px 16px", borderBottom: "1px solid var(--line)",
            fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--ink-3)", fontWeight: 500,
          }}>
            <span>Title</span>
            <span>Subject</span>
            <span>Type</span>
            <span>Difficulty</span>
            <span style={{ textAlign: "right" }}>Modified</span>
          </div>
          {items.map((it, i) => {
            const subj = SUBJECTS.find(x => x.id === it.subj);
            const KI = KIND_ICONS[it.kind];
            const SI = SUBJECT_ICONS[it.subj];
            return (
              <div key={i} data-subject={it.subj} style={{
                display: "grid", gridTemplateColumns: "1.6fr auto 100px 110px 80px",
                gap: 12, padding: "10px 16px", alignItems: "center",
                borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: "var(--s-soft)", color: "var(--s)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <span style={{ width: 14, height: 14 }}><KI /></span>
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.meta}</div>
                  </div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--s)", whiteSpace: "nowrap" }}>
                  <span style={{ width: 11, height: 11, flexShrink: 0 }}><SI /></span>{subj.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{it.tag}</span>
                <span className="mono" style={{ fontSize: 11, color: it.diff === "III" ? "var(--due)" : it.diff === "II" ? "var(--warn)" : "var(--ok)" }}>{it.diff}</span>
                <span className="mono tabular" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>{it.t}</span>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ── Calendar ───────────────────────────────────────────────────────────────
const CAL_EVENTS = [
  // each: day (0=Mon..6=Sun), startHour, length, subj, kind, title
  { d: 0, h: 14, l: 1.5, subj: "prog", kind: "Lecture",   title: "Algorithms 13 — RB-trees" },
  { d: 0, h: 16, l: 2,   subj: "prog", kind: "Lab",       title: "RB-tree implementation" },
  { d: 1, h: 9,  l: 1.5, subj: "math", kind: "Lecture",   title: "Real analysis — §4" },
  { d: 1, h: 11, l: 1,   subj: "bio",  kind: "Lecture",   title: "Membrane transport" },
  { d: 1, h: 18, l: 1.5, subj: "math", kind: "Tutorial",  title: "Pset 4 walkthrough" },
  { d: 2, h: 13, l: 1,   subj: "chem", kind: "Lecture",   title: "Functional groups" },
  { d: 2, h: 14, l: 1.5, subj: "prog", kind: "Lecture",   title: "Algorithms 14" },
  { d: 2, h: 16, l: 1,   subj: "lit",  kind: "Seminar",   title: "Woolf workshop" },
  { d: 3, h: 9,  l: 1.5, subj: "math", kind: "Lecture",   title: "Real analysis — §5" },
  { d: 3, h: 10, l: 1,   subj: "phys", kind: "Lecture",   title: "Lagrangian formalism" },
  { d: 4, h: 11, l: 1,   subj: "bio",  kind: "Lab",       title: "Microscopy" },
  { d: 4, h: 13, l: 1,   subj: "chem", kind: "Lecture",   title: "Reactions overview" },
  { d: 4, h: 17, l: 2,   subj: "lit",  kind: "Deadline",  title: "Essay due — Woolf" },
  { d: 5, h: 10, l: 2,   subj: "math", kind: "Self-study",title: "Pset 4 finalize" },
  { d: 6, h: 14, l: 2,   subj: "lit",  kind: "Reading",   title: "Mrs Dalloway pp 47–88" },
];

function Calendar_View() {
  const days = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 - 20

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 6 }}>Week 12 · Hilary term</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            12 – 18 May
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost">‹</Btn>
          <Btn variant="default">Today</Btn>
          <Btn variant="ghost">›</Btn>
          <Btn icon={Ic.Plus} variant="primary">Block time</Btn>
        </div>
      </div>

      <Card padded={false} style={{ overflow: "hidden" }}>
        {/* header row */}
        <div style={{
          display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)",
          borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
        }}>
          <div />
          {days.map((d, i) => (
            <div key={d} style={{
              padding: "10px 12px", borderLeft: "1px solid var(--line)",
              fontSize: 11.5, color: i === 4 ? "var(--accent)" : "var(--ink-2)",
              fontWeight: i === 4 ? 500 : 400,
            }}>
              <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.split(" ")[0]}</span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 18 }}>{d.split(" ")[1]}</span>
            </div>
          ))}
        </div>

        {/* grid */}
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>
          {/* hour gutter */}
          <div>
            {hours.map(h => (
              <div key={h} style={{
                height: 44, borderBottom: "1px solid var(--line-soft)",
                fontSize: 10, color: "var(--ink-4)", padding: "4px 8px",
                fontFamily: "var(--font-mono)",
              }}>{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>

          {/* day columns */}
          {days.map((d, di) => (
            <div key={di} style={{ position: "relative", borderLeft: "1px solid var(--line)" }}>
              {hours.map(h => (
                <div key={h} style={{ height: 44, borderBottom: "1px solid var(--line-soft)" }} />
              ))}
              {di === 4 && (
                <div style={{ position: "absolute", left: 0, right: 0, top: ((14.5 - 8) * 44), height: 1, background: "var(--accent)", zIndex: 5 }}>
                  <span style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                </div>
              )}
              {CAL_EVENTS.filter(e => e.d === di).map((ev, i) => (
                <div key={i} data-subject={ev.subj} style={{
                  position: "absolute",
                  top: (ev.h - 8) * 44 + 2,
                  height: ev.l * 44 - 4,
                  left: 4, right: 4,
                  background: "var(--s-soft)",
                  borderLeft: "3px solid var(--s)",
                  borderRadius: 4,
                  padding: "5px 8px",
                  fontSize: 11,
                  overflow: "hidden",
                  color: "var(--ink)",
                }}>
                  <div style={{ fontSize: 10, color: "var(--s)", fontWeight: 500 }}>{ev.kind}</div>
                  <div style={{ fontWeight: 500, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
function Analytics() {
  const recall = [
    { s: "math", v: 89, trend: +4 },
    { s: "prog", v: 91, trend: +2 },
    { s: "bio",  v: 71, trend: -3 },
    { s: "lit",  v: 82, trend: +1 },
    { s: "phys", v: 64, trend: -6 },
    { s: "chem", v: 70, trend: +5 },
  ];

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div className="label-xs" style={{ marginBottom: 6 }}>Analytics</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
          How you've been learning
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <Card><div className="label-xs" style={{ marginBottom: 6 }}>Hours · this term</div><div style={{ fontFamily: "var(--font-serif)", fontSize: 32 }} className="tabular">217h</div><div style={{ fontSize: 11, color: "var(--ok)" }}>+12% vs last term</div></Card>
        <Card><div className="label-xs" style={{ marginBottom: 6 }}>Notes written</div><div style={{ fontFamily: "var(--font-serif)", fontSize: 32 }} className="tabular">38.4k</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>words across 6 subjects</div></Card>
        <Card><div className="label-xs" style={{ marginBottom: 6 }}>Cards reviewed</div><div style={{ fontFamily: "var(--font-serif)", fontSize: 32 }} className="tabular">2,481</div><div style={{ fontSize: 11, color: "var(--ok)" }}>82% accuracy</div></Card>
        <Card><div className="label-xs" style={{ marginBottom: 6 }}>Longest focus</div><div style={{ fontFamily: "var(--font-serif)", fontSize: 32 }} className="tabular">2h 14m</div><div style={{ fontSize: 11, color: "var(--ink-3)" }}>Tue · Programming</div></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card padded={false}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <div className="label-xs">Term focus distribution</div>
            <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Hours per subject</div>
          </div>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {SUBJECTS.map(s => {
              const pct = (s.hours / 60) * 100;
              const I = SUBJECT_ICONS[s.id];
              return (
                <div key={s.id} data-subject={s.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 60px", gap: 12, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-13)" }}>
                    <span style={{ width: 12, height: 12, color: "var(--s)" }}><I /></span>{s.name}
                  </span>
                  <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--s)" }} />
                  </div>
                  <span className="mono tabular" style={{ fontSize: 11.5, color: "var(--ink-2)", textAlign: "right" }}>{s.hours}h</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padded={false}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
            <div className="label-xs">Spaced repetition recall</div>
            <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>7-day average</div>
          </div>
          <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {recall.map(r => {
              const subj = SUBJECTS.find(s => s.id === r.s);
              return (
                <div key={r.s} data-subject={r.s} style={{ display: "grid", gridTemplateColumns: "100px 1fr auto", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: "var(--fs-13)" }}>{subj.name}</span>
                  <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${r.v}%`, height: "100%", background: "var(--s)" }} />
                  </div>
                  <span className="mono tabular" style={{ fontSize: 11.5, color: r.trend > 0 ? "var(--ok)" : "var(--due)" }}>
                    {r.v}%  {r.trend > 0 ? "↑" : "↓"}{Math.abs(r.trend)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Inbox ──────────────────────────────────────────────────────────────────
const INBOX = [
  { from: "Prof. A. Kowalski",  subj: "math", title: "Pset 4 — note on problem 4.5",   t: "08:42", unread: true,  prev: "Several students have asked about the contractive sequence definition. The key is that the contraction constant must be strictly less than one…" },
  { from: "Dr. M. Tanaka",      subj: "prog", title: "Lab 7 deadline extended",        t: "Yest",  unread: true,  prev: "Given the Cargo registry outage on Tuesday, the deadline for the persistent RB-tree lab is now pushed to Friday 23:59." },
  { from: "LearnLens",          subj: null,    title: "Weekly summary ready",          t: "Yest",  unread: true,  prev: "You logged 14h 22m this week — a personal best. Your weakest area is Krebs cycle (recall 64%)…" },
  { from: "Dr. E. Vasquez",     subj: "lit",  title: "Essay feedback — outline",       t: "Mon",   unread: false, prev: "The thesis is strong but the second paragraph still elides the question of voice. Consider Auerbach on Woolf…" },
  { from: "Study group · Algo", subj: "prog", title: "RB-tree session tomorrow?",      t: "Sun",   unread: false, prev: "Hi all — proposing a 3-hour block in the library on Wed afternoon to grind through invariant proofs together." },
];

function Inbox() {
  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div className="label-xs" style={{ marginBottom: 6 }}>Inbox · 3 unread</div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
          From your instructors
        </h1>
      </div>
      <Card padded={false}>
        {INBOX.map((m, i) => {
          const subj = m.subj && SUBJECTS.find(s => s.id === m.subj);
          const I = m.subj ? SUBJECT_ICONS[m.subj] : Ic.Bell;
          return (
            <div key={i} data-subject={m.subj || undefined} style={{
              display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14,
              padding: "14px 18px", alignItems: "flex-start",
              borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
              background: m.unread ? "color-mix(in oklch, var(--accent-soft) 25%, transparent)" : "transparent",
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 6,
                background: m.subj ? "var(--s-soft)" : "var(--surface-2)",
                color: m.subj ? "var(--s)" : "var(--ink-2)",
                display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2,
              }}>
                <span style={{ width: 15, height: 15 }}><I /></span>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                  <span style={{ fontSize: "var(--fs-14)", fontWeight: m.unread ? 600 : 500 }}>{m.from}</span>
                  {subj && <Pill subject={m.subj} tone="subject">{subj.name}</Pill>}
                </div>
                <div style={{ fontSize: "var(--fs-14)", fontWeight: m.unread ? 500 : 400, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)", lineHeight: 1.5, textWrap: "pretty" }}>{m.prev}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span className="mono tabular" style={{ fontSize: 11, color: m.unread ? "var(--accent)" : "var(--ink-3)" }}>{m.t}</span>
                {m.unread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

export {
  Library,
  Calendar_View,
  Analytics,
  Inbox,
};
