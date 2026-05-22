import React, { useState, useMemo } from "react";
import { useAppData } from "./data.js";
import { Card, Pill, Btn, SectionTitle, Ic, SUBJECT_ICONS } from "./Shell.jsx";

// ── Library ────────────────────────────────────────────────────────────────
const LIB_TYPES_BASE = [
  { id: "all",  label: "All" },
  { id: "pdf",  label: "PDFs",       icon: Ic.Pdf },
  { id: "note", label: "Notes",      icon: Ic.Note },
  { id: "video",label: "Lectures",   icon: Ic.Video },
  { id: "code", label: "Code",       icon: Ic.Code },
  { id: "card", label: "Flashcards", icon: Ic.Card },
  { id: "quiz", label: "Quizzes",    icon: Ic.Quiz },
];

const KIND_ICONS = { pdf: Ic.Pdf, video: Ic.Video, note: Ic.Note, code: Ic.Code, card: Ic.Card, quiz: Ic.Quiz };

function Library() {
  const d = useAppData();
  const [type, setType] = useState("all");
  const items = type === "all" ? d.libItems : d.libItems.filter(i => i.kind === type);

  const counts = useMemo(() => {
    const c = { all: d.libItems.length };
    for (const t of LIB_TYPES_BASE) if (t.id !== "all") c[t.id] = d.libItems.filter(i => i.kind === t.id).length;
    return c;
  }, [d.libItems]);

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 6 }}>Resource Library</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            {d.libItems.length > 0 ? "Everything you've gathered" : "Your library is empty"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon={Ic.Filter} variant="ghost">Filter</Btn>
          <Btn icon={Ic.Upload} variant="primary">Upload</Btn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 8 }}>By type</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {LIB_TYPES_BASE.map(t => {
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
                  <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{counts[t.id]}</span>
                </button>
              );
            })}
          </div>

          {d.subjects.length > 0 && (
            <>
              <div className="label-xs" style={{ marginTop: 22, marginBottom: 8 }}>By subject</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {d.subjects.map(s => {
                  const I = SUBJECT_ICONS[s.id];
                  return (
                    <button key={s.id} data-subject={s.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                      borderRadius: "var(--r-sm)", fontSize: "var(--fs-13)",
                      color: "var(--ink-2)",
                    }}>
                      <span style={{ width: 12, height: 12, color: "var(--s)" }}>{I && <I />}</span>
                      <span style={{ flex: 1, textAlign: "left" }}>{s.name}</span>
                      <span className="mono tabular" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{s.resourceCount}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Card padded={false}>
          {d.libItems.length === 0 ? (
            <EmptyState
              icon={Ic.Books}
              title="Nothing in your library yet"
              hint="Upload a PDF or paste notes — the AI will chunk and index them so you can ask questions, generate summaries, and build quizzes."
              cta={{ icon: Ic.Upload, label: "Upload your first resource" }}
            />
          ) : (
            <>
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
                const subj = d.subjects.find(x => x.id === it.subj);
                const KI = KIND_ICONS[it.kind];
                const SI = subj ? SUBJECT_ICONS[it.subj] : null;
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
                      {SI && <span style={{ width: 11, height: 11, flexShrink: 0 }}><SI /></span>}
                      {subj?.name || "—"}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{it.tag}</span>
                    <span className="mono" style={{ fontSize: 11, color: it.diff === "III" ? "var(--due)" : it.diff === "II" ? "var(--warn)" : "var(--ok)" }}>{it.diff}</span>
                    <span className="mono tabular" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>{it.t}</span>
                  </div>
                );
              })}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Generic empty state ────────────────────────────────────────────────────
function EmptyState({ icon: I, title, hint, cta, onCta }) {
  return (
    <div style={{ padding: "56px 32px 64px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: "var(--surface-2)", color: "var(--ink-3)",
        display: "grid", placeItems: "center", margin: "0 auto 16px",
        border: "1px dashed var(--line-strong)",
      }}>
        <span style={{ width: 24, height: 24 }}>{I && <I />}</span>
      </div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)", maxWidth: 460, margin: "0 auto 18px", lineHeight: 1.55, textWrap: "pretty" }}>
        {hint}
      </div>
      {cta && <Btn variant="primary" icon={cta.icon} onClick={onCta}>{cta.label}</Btn>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Calendar — dynamic dates, event composer
// ═══════════════════════════════════════════════════════════════════════════
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Calendar_View() {
  const d = useAppData();
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const dates = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday); dt.setDate(monday.getDate() + i); return dt;
  });
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  const [events, setEvents] = useState(d.calEvents);
  const [composer, setComposer] = useState(null);
  const [draft, setDraft] = useState({ title: "", subj: d.subjects[0]?.id || "", kind: "Lecture", length: 1 });

  const addEvent = () => {
    if (!draft.title.trim() || composer == null) return;
    setEvents(es => [...es, { d: composer.day, h: composer.hour, l: parseFloat(draft.length), subj: draft.subj, kind: draft.kind, title: draft.title }]);
    setComposer(null);
    setDraft({ title: "", subj: d.subjects[0]?.id || "", kind: "Lecture", length: 1 });
  };

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 6 }}>This week</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            {dates[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {dates[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn variant="ghost">‹</Btn>
          <Btn variant="default">Today</Btn>
          <Btn variant="ghost">›</Btn>
          <Btn icon={Ic.Plus} variant="primary" onClick={() => setComposer({ day: today.getDay() === 0 ? 6 : today.getDay() - 1, hour: 14 })}>
            Block time
          </Btn>
        </div>
      </div>

      {events.length === 0 && (
        <Card style={{ marginBottom: 16, padding: "18px 22px", background: "var(--accent-soft)", borderColor: "var(--accent-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{
              width: 38, height: 38, borderRadius: 10,
              background: "var(--surface)", color: "var(--accent)",
              display: "grid", placeItems: "center", flexShrink: 0,
              border: "1px solid var(--accent-line)",
            }}><span style={{ width: 19, height: 19 }}><Ic.Cal /></span></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, marginBottom: 2, color: "var(--ink)" }}>
                Your calendar is empty — block some time.
              </div>
              <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-2)" }}>
                Click any cell below, or use <span className="mono" style={{
                  padding: "1px 5px", borderRadius: 3, background: "var(--surface)", border: "1px solid var(--line)",
                }}>Block time</span>. Events sync to today's tasks.
              </div>
            </div>
            <Btn variant="accent" icon={Ic.Plus} onClick={() => setComposer({ day: today.getDay() === 0 ? 6 : today.getDay() - 1, hour: 14 })}>
              Block time
            </Btn>
          </div>
        </Card>
      )}

      <Card padded={false} style={{ overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)",
          borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
        }}>
          <div />
          {dates.map((dt, i) => {
            const isToday = dt.toDateString() === today.toDateString();
            return (
              <div key={i} style={{
                padding: "10px 12px", borderLeft: "1px solid var(--line)",
                fontSize: 11.5, color: isToday ? "var(--accent)" : "var(--ink-2)",
                fontWeight: isToday ? 500 : 400,
              }}>
                <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{DAY_LABELS[i]}</span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 18 }}>{dt.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, 1fr)", position: "relative" }}>
          <div>
            {hours.map(h => (
              <div key={h} style={{
                height: 44, borderBottom: "1px solid var(--line-soft)",
                fontSize: 10, color: "var(--ink-4)", padding: "4px 8px",
                fontFamily: "var(--font-mono)",
              }}>{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>

          {dates.map((dt, di) => {
            const isToday = dt.toDateString() === today.toDateString();
            const nowMins = isToday ? today.getHours() + today.getMinutes() / 60 : null;
            return (
              <div key={di} style={{ position: "relative", borderLeft: "1px solid var(--line)" }}>
                {hours.map(h => (
                  <div key={h}
                    onClick={() => setComposer({ day: di, hour: h })}
                    style={{
                      height: 44, borderBottom: "1px solid var(--line-soft)",
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  />
                ))}
                {nowMins != null && nowMins >= 8 && nowMins < 21 && (
                  <div style={{ position: "absolute", left: 0, right: 0, top: ((nowMins - 8) * 44), height: 1, background: "var(--accent)", zIndex: 5, pointerEvents: "none" }}>
                    <span style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                  </div>
                )}
                {events.filter(e => e.d === di).map((ev, i) => (
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
                    pointerEvents: "none",
                  }}>
                    <div style={{ fontSize: 10, color: "var(--s)", fontWeight: 500 }}>{ev.kind}</div>
                    <div style={{ fontWeight: 500, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Card>

      {composer && (
        <Card style={{ marginTop: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div className="label-xs">Add event</div>
              <div style={{ fontSize: "var(--fs-15)", fontWeight: 500 }}>
                {DAY_LABELS[composer.day]} · {String(composer.hour).padStart(2, "0")}:00
              </div>
            </div>
            <button onClick={() => setComposer(null)} style={{
              width: 24, height: 24, color: "var(--ink-3)", display: "grid", placeItems: "center", borderRadius: 4,
            }}><span style={{ width: 13, height: 13 }}><Ic.X /></span></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.7fr auto", gap: 8 }}>
            <input autoFocus placeholder="Event title — e.g. Pset 4 study"
              value={draft.title} onChange={e => setDraft(s => ({ ...s, title: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              style={{
                padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6,
                fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)",
              }} />
            <select value={draft.subj} onChange={e => setDraft(s => ({ ...s, subj: e.target.value }))} style={selectStyle}>
              <option value="">No subject</option>
              {d.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={draft.kind} onChange={e => setDraft(s => ({ ...s, kind: e.target.value }))} style={selectStyle}>
              {["Lecture", "Lab", "Tutorial", "Reading", "Self-study", "Deadline", "Quiz"].map(k => <option key={k}>{k}</option>)}
            </select>
            <select value={draft.length} onChange={e => setDraft(s => ({ ...s, length: e.target.value }))} style={selectStyle}>
              {[0.5, 1, 1.5, 2, 2.5, 3].map(l => <option key={l} value={l}>{l}h</option>)}
            </select>
            <Btn variant="primary" icon={Ic.Plus} onClick={addEvent}>Add</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

const selectStyle = {
  padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6,
  fontSize: "var(--fs-13)", background: "var(--surface)", color: "var(--ink)",
};

// ═══════════════════════════════════════════════════════════════════════════
// Analytics — empty state when no data
// ═══════════════════════════════════════════════════════════════════════════
function Analytics() {
  const d = useAppData();
  const recall = [
    { s: "math", v: 89, trend: +4 },
    { s: "prog", v: 91, trend: +2 },
    { s: "bio",  v: 71, trend: -3 },
    { s: "lit",  v: 82, trend: +1 },
    { s: "phys", v: 64, trend: -6 },
    { s: "chem", v: 70, trend: +5 },
  ];

  if (!d.demo && d.subjects.length === 0) {
    return (
      <div style={{ padding: "28px 32px 60px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 22 }}>
          <div className="label-xs" style={{ marginBottom: 6 }}>Analytics</div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            How you've been learning
          </h1>
        </div>
        <Card padded={false}>
          <EmptyState icon={Ic.Chart} title="No analytics yet"
            hint="Start a focus session, finish a quiz, or review some flashcards — the numbers will fill in here and update in real time."
            cta={{ icon: Ic.Timer, label: "Start a focus session" }} />
        </Card>
      </div>
    );
  }

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
            {d.subjects.map(s => {
              const pct = (s.hours / 60) * 100;
              const I = SUBJECT_ICONS[s.id];
              return (
                <div key={s.id} data-subject={s.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 60px", gap: 12, alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--fs-13)" }}>
                    <span style={{ width: 12, height: 12, color: "var(--s)" }}>{I && <I />}</span>{s.name}
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
            {recall.filter(r => d.subjects.find(s => s.id === r.s)).map(r => {
              const subj = d.subjects.find(s => s.id === r.s);
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

// ═══════════════════════════════════════════════════════════════════════════
// Inbox — Messages + Friends tabs
// ═══════════════════════════════════════════════════════════════════════════
function Inbox() {
  const d = useAppData();
  const [tab, setTab] = useState("messages");
  const unread = d.inbox.filter(m => m.unread).length;

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="label-xs" style={{ marginBottom: 6 }}>
          Inbox{tab === "messages" && unread > 0 && ` · ${unread} unread`}
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
          {tab === "messages" ? "From your instructors" : "Friends & study buddies"}
        </h1>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, borderBottom: "1px solid var(--line)" }}>
        <InboxTab id="messages" active={tab === "messages"} onClick={() => setTab("messages")} icon={Ic.Inbox} label="Messages" count={d.inbox.length} />
        <InboxTab id="friends"  active={tab === "friends"}  onClick={() => setTab("friends")}  icon={Ic.Users} label="Friends"  count={d.friends.length} />
        <div style={{ flex: 1 }} />
        {tab === "messages"
          ? <Btn icon={Ic.Plus} variant="ghost">Compose</Btn>
          : <Btn icon={Ic.Plus} variant="primary">Invite friends</Btn>}
      </div>

      {tab === "messages" ? <MessagesTab inbox={d.inbox} subjects={d.subjects} /> : <FriendsTab d={d} />}
    </div>
  );
}

function InboxTab({ active, onClick, icon: I, label, count }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 7, padding: "10px 14px",
      borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
      color: active ? "var(--ink)" : "var(--ink-3)",
      fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
      marginBottom: -1,
    }}>
      <span style={{ width: 13, height: 13, color: active ? "var(--accent)" : "var(--ink-3)" }}><I /></span>
      {label}
      <span className="mono tabular" style={{
        fontSize: 10.5, padding: "1px 6px", borderRadius: 100,
        background: active ? "var(--accent-soft)" : "var(--surface-2)",
        color: active ? "var(--accent)" : "var(--ink-3)",
      }}>{count}</span>
    </button>
  );
}

function MessagesTab({ inbox, subjects }) {
  if (inbox.length === 0) {
    return (
      <Card padded={false}>
        <EmptyState icon={Ic.Inbox} title="Your inbox is empty"
          hint="Course announcements, deadline updates, and AI-generated weekly summaries will show up here. Connect a course or invite an instructor to get started."
          cta={{ icon: Ic.Plus, label: "Connect a course" }} />
      </Card>
    );
  }
  return (
    <Card padded={false}>
      {inbox.map((m, i) => {
        const subj = m.subj && subjects.find(s => s.id === m.subj);
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
              <span style={{ width: 15, height: 15 }}>{I && <I />}</span>
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
  );
}

// ── Friends tab ────────────────────────────────────────────────────────────
function FriendsTab({ d }) {
  const [search, setSearch] = useState("");
  const filteredFriends = d.friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
      <Card padded={false}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            padding: "6px 10px", borderRadius: 6, background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}>
            <span style={{ width: 13, height: 13, color: "var(--ink-3)" }}><Ic.Search /></span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search friends or invite by @handle"
              style={{
                flex: 1, background: "none", border: 0, outline: "none",
                fontSize: "var(--fs-13)", color: "var(--ink)",
              }} />
            <button style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>Invite</button>
          </div>
        </div>
        {filteredFriends.length === 0 ? (
          <EmptyState icon={Ic.Users} title="No friends yet"
            hint="Invite classmates by their @handle to share notes, ask quick questions, and form study groups. Their study activity stays private until they accept."
            cta={{ icon: Ic.Send, label: "Send invite" }} />
        ) : (
          filteredFriends.map((f, i) => <FriendRow key={f.id} f={f} subjects={d.subjects} first={i === 0} />)
        )}
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Card padded={false}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--line)",
          }}>
            <div>
              <div className="label-xs">Requests</div>
              <div style={{ fontSize: "var(--fs-14)", fontWeight: 500 }}>Awaiting your response</div>
            </div>
            <Pill tone="accent">{d.requests.length}</Pill>
          </div>
          {d.requests.length === 0
            ? <div style={{ padding: "20px 16px", fontSize: 12, color: "var(--ink-3)", textAlign: "center" }}>No pending requests.</div>
            : d.requests.map((r, i) => <RequestRow key={r.id} r={r} first={i === 0} />)
          }
        </Card>

        <Card padded={false}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="label-xs">Suggested</div>
            <div style={{ fontSize: "var(--fs-14)", fontWeight: 500 }}>People in your courses</div>
          </div>
          {d.suggestions.map((s, i) => <SuggestionRow key={s.id} s={s} first={i === 0} />)}
        </Card>
      </div>
    </div>
  );
}

const STATUS_META = {
  online:   { c: "var(--ok)",     l: "online" },
  studying: { c: "var(--accent)", l: "studying" },
  focus:    { c: "var(--warn)",   l: "in focus" },
  offline:  { c: "var(--ink-4)",  l: "offline" },
};

function FriendRow({ f, subjects, first }) {
  const meta = STATUS_META[f.status] || STATUS_META.offline;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      gap: 12, padding: "12px 16px", alignItems: "center",
      borderTop: first ? "none" : "1px solid var(--line-soft)",
    }}>
      <div style={{ position: "relative" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: `linear-gradient(135deg, oklch(82% 0.08 ${(f.id.charCodeAt(1) * 47) % 360}), oklch(56% 0.14 ${(f.id.charCodeAt(1) * 47) % 360}))`,
          display: "grid", placeItems: "center",
          color: "white", fontWeight: 600, fontSize: 12,
        }}>{f.initials}</div>
        <span style={{
          position: "absolute", right: -1, bottom: -1, width: 9, height: 9,
          borderRadius: "50%", background: meta.c,
          border: "2px solid var(--surface)",
        }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "var(--fs-14)", fontWeight: 500 }}>{f.name}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>@{f.handle}</span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: meta.c }}>● {meta.l}</span>
          {f.shared.length > 0 && (
            <>
              <span>·</span>
              <span>shares {f.shared.slice(0, 2).join(", ")}</span>
            </>
          )}
          <span>·</span>
          <span className="mono tabular">{f.lastSeen}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Btn variant="ghost" icon={Ic.Send}>Message</Btn>
      </div>
    </div>
  );
}

function RequestRow({ r, first }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      gap: 10, padding: "12px 16px", alignItems: "center",
      borderTop: first ? "none" : "1px solid var(--line-soft)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "var(--surface-2)", color: "var(--ink-2)",
        display: "grid", placeItems: "center", fontWeight: 600, fontSize: 11,
        border: "1px solid var(--line)",
      }}>{r.initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "var(--fs-13)", fontWeight: 500 }}>{r.name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
          {r.ctx} · <span className="mono">{r.mutual} mutual</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <button style={miniBtn("accent")}>Accept</button>
        <button style={miniBtn("ghost")}>Ignore</button>
      </div>
    </div>
  );
}

function SuggestionRow({ s, first }) {
  const [sent, setSent] = useState(false);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto 1fr auto",
      gap: 10, padding: "12px 16px", alignItems: "center",
      borderTop: first ? "none" : "1px solid var(--line-soft)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `linear-gradient(135deg, oklch(82% 0.06 ${(s.id.charCodeAt(1) * 89) % 360}), oklch(58% 0.10 ${(s.id.charCodeAt(1) * 89) % 360}))`,
        display: "grid", placeItems: "center", color: "white", fontWeight: 600, fontSize: 11,
      }}>{s.initials}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "var(--fs-13)", fontWeight: 500 }}>{s.name}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
          {s.ctx} · <span className="mono">{s.mutual} mutual</span>
        </div>
      </div>
      <button onClick={() => setSent(v => !v)} style={miniBtn(sent ? "ghost" : "default")}>
        {sent ? "✓ Sent" : "Connect"}
      </button>
    </div>
  );
}

function miniBtn(v) {
  const map = {
    accent: { bg: "var(--accent)", c: "var(--on-accent)", b: "var(--accent)" },
    default:{ bg: "var(--surface)", c: "var(--ink)", b: "var(--line)" },
    ghost:  { bg: "transparent", c: "var(--ink-3)", b: "var(--line)" },
  };
  const t = map[v];
  return {
    padding: "4px 10px", borderRadius: 4, border: `1px solid ${t.b}`,
    background: t.bg, color: t.c, fontSize: 11.5, fontWeight: 500,
  };
}

export { Library, Calendar_View, Analytics, Inbox };
