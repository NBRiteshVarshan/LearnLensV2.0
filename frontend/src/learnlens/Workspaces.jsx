import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  useAppData,
  MATH_UNITS, MATH_THEOREMS, MATH_PROBLEMS,
  PROG_FILES, PROG_TERMINAL, PROG_CONCEPTS,
  BIO_DIAGRAMS, BIO_GLOSSARY,
  LIT_PASSAGE, LIT_ANNOTATIONS,
} from "./data.js";
import { Card, Pill, Btn, SectionTitle, Ic, SUBJECT_ICONS, getCustomColorVars } from "./Shell.jsx";
import { emitAIActivity } from "./useStudyAnalytics.jsx";

function useSubjectResources(subjectId) {
  const [all, setAll] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ll-resources-v1") || "[]"); }
    catch { return []; }
  });

  const resources = all.filter(r => r.subjectId === subjectId);

  const mutate = (fn) => setAll(prev => {
    const next = fn(prev);
    try { localStorage.setItem("ll-resources-v1", JSON.stringify(next)); } catch {}
    return next;
  });

  const addPDF = (file, onError) => {
    if (file.size > 2 * 1024 * 1024) {
      onError?.("File exceeds 2 MB. Use Upload & Index in AI Tools for larger PDFs.");
      return;
    }
    const rid = `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const reader = new FileReader();
    reader.onload = (e) => {
      mutate(prev => [...prev, {
        id: rid, subjectId, type: "pdf",
        name: file.name, size: file.size,
        date: new Date().toISOString().slice(0, 10),
        dataUrl: e.target.result,
        pdfId: null, indexed: false,
      }]);
      (async () => {
        try {
          emitAIActivity({ type: "upload", label: `Uploading ${file.name}`, status: "processing" });
          const formData = new FormData();
          formData.append("file", file);
          const upRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (!upRes.ok) return;
          const { pdf_id } = await upRes.json();
          const ingRes = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdf_id }),
          });
          if (!ingRes.ok) return;
          mutate(prev => prev.map(r => r.id === rid ? { ...r, pdfId: pdf_id, indexed: true } : r));
          emitAIActivity({ type: "embed", label: `Indexed ${file.name}`, status: "done" });
        } catch { /* non-fatal — PDF is still saved locally */ }
      })();
    };
    reader.readAsDataURL(file);
  };

  const addLink = ({ name, url }) => mutate(prev => [...prev, {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subjectId, type: "link", name, url,
    date: new Date().toISOString().slice(0, 10),
  }]);

  const deleteResource = (id) => mutate(prev => prev.filter(r => r.id !== id));

  const updateLink = (id, patch) => mutate(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  return { resources, addPDF, addLink, deleteResource, updateLink };
}

// ── Add-content menu used by every subject header ──────────────────────────
const ADD_KINDS = [
  { id: "homework", label: "Homework",        hint: "Assignment with a due date",         icon: "Note" },
  { id: "resource", label: "Resource",         hint: "Upload a PDF or save a link",         icon: "Books" },
  { id: "note",     label: "Note",            hint: "Free-form study note",               icon: "Note" },
  { id: "quiz",     label: "Quiz",            hint: "Generate from notes via AI Tools",   icon: "Quiz" },
  { id: "deck",     label: "Flashcard deck",  hint: "Spaced-repetition deck",             icon: "Card" },
];

function AddContentMenu({ subject, onAdd }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(null);
  const [draft, setDraft] = useState({ title: "", due: "" });
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setStage(null); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const submit = () => {
    if (!draft.title.trim() || !stage) return;
    onAdd?.({ kind: stage, ...draft, subj: subject.id });
    setOpen(false); setStage(null); setDraft({ title: "", due: "" });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Btn icon={Ic.Plus} variant="primary" onClick={() => setOpen(o => !o)}>Add</Btn>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--surface)", border: "1px solid var(--line)",
          borderRadius: 10, boxShadow: "var(--shadow-lg)", padding: 0, zIndex: 30,
          minWidth: 320, animation: "ll-fade-in 140ms ease",
        }}>
          {!stage ? (
            <div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="label-xs">Add to {subject.name}</div>
              </div>
              <div style={{ padding: 4 }}>
                {ADD_KINDS.map(k => {
                  const I = Ic[k.icon];
                  return (
                    <button key={k.id} onClick={() => {
                      if (k.id === "resource") {
                        onAdd?.({ kind: "resource", subj: subject.id });
                        setOpen(false);
                      } else {
                        setStage(k.id);
                      }
                    }} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
                      padding: "9px 10px", borderRadius: 6, textAlign: "left",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 6,
                        background: "var(--s-soft)", color: "var(--s)",
                        display: "grid", placeItems: "center", flexShrink: 0,
                      }}>{I && <span style={{ width: 13, height: 13 }}><I /></span>}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-13)", fontWeight: 500 }}>{k.label}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{k.hint}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="label-xs">New {ADD_KINDS.find(k => k.id === stage).label.toLowerCase()}</div>
                <button onClick={() => setStage(null)} style={{ fontSize: 11, color: "var(--accent)" }}>← back</button>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <input autoFocus value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder={
                    stage === "homework" ? "Assignment — e.g. Pset 5" :
                    stage === "note"     ? "Note title" :
                    stage === "quiz"     ? "Quiz topic — e.g. RB-tree invariants" :
                                          "Deck name — e.g. Functional groups"
                  }
                  onKeyDown={e => e.key === "Enter" && submit()}
                  style={{
                    padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 6,
                    fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)",
                  }} />
                {stage === "homework" && (
                  <input value={draft.due} onChange={e => setDraft(d => ({ ...d, due: e.target.value }))}
                    placeholder="Due — e.g. Friday 23:59"
                    style={{
                      padding: "9px 11px", border: "1px solid var(--line)", borderRadius: 6,
                      fontSize: "var(--fs-13)", background: "var(--surface)", color: "var(--ink)",
                    }} />
                )}
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Btn variant="ghost" onClick={() => { setOpen(false); setStage(null); }}>Cancel</Btn>
                  <Btn variant="primary" icon={Ic.Plus} onClick={submit}>Add to {subject.name}</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared subject header ──────────────────────────────────────────────────
const CAL_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useNextCalSession(subjectId) {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem("ll-calendar-events-v1");
      if (!raw) return null;
      const evts = JSON.parse(raw);
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const todayIdx = (today.getDay() + 6) % 7;
      const upcoming = evts
        .filter(ev => ev.subj === subjectId)
        .map(ev => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + ev.d);
          d.setHours(ev.h, 0, 0, 0);
          return { ev, date: d };
        })
        .filter(({ date }) => date > today)
        .sort((a, b) => a.date - b.date);
      if (!upcoming.length) return null;
      const { ev } = upcoming[0];
      const label = ev.d === todayIdx ? "Today" : CAL_DAY_LABELS[ev.d];
      const h = ev.h % 12 || 12;
      const ampm = ev.h >= 12 ? "PM" : "AM";
      return `${label} ${h}:00 ${ampm}`;
    } catch { return null; }
  }, [subjectId]);
}

function SubjectHeader({ s, tabs, tab, setTab, recent, onAdd }) {
  const SI = SUBJECT_ICONS[s.id];
  const isCustom = !SI;
  const CI = isCustom && s.icon ? Ic[s.icon] : null;
  const colorVars = isCustom ? getCustomColorVars(s.color) : {};
  const nextSession = useNextCalSession(s.id);
  return (
    <div data-subject={s.id} style={{
      padding: "22px 32px 0", borderBottom: "1px solid var(--line)",
      background: `linear-gradient(180deg, color-mix(in oklch, var(--s-soft) 50%, var(--surface)) 0%, var(--bg) 100%)`,
      ...colorVars,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8,
            background: "var(--surface)", border: "1px solid var(--s-line)",
            display: "grid", placeItems: "center", color: "var(--s)",
            boxShadow: "var(--shadow-sm)",
          }}>
            {SI ? (
              <span style={{ width: 22, height: 22 }}><SI /></span>
            ) : CI ? (
              <span style={{ width: 22, height: 22 }}><CI /></span>
            ) : (
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                {(s.name || "?").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 2 }}>
              {s.code} · {s.instructor} · {nextSession ? `Next: ${nextSession}` : s.session}
            </div>
            <h1 style={{
              fontFamily: "var(--font-serif)", fontWeight: 400,
              fontSize: "var(--fs-28)", letterSpacing: "-0.02em", lineHeight: 1.1,
              marginBottom: 4,
            }}>
              {s.name} <span style={{ color: "var(--ink-3)" }}>·</span>{" "}
              <span style={{ fontStyle: "italic", color: "var(--ink-2)" }}>{s.title}</span>
            </h1>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Pill subject={s.id} tone="subject">{s.unitDone} / {s.units} units</Pill>
              <Pill tone="neutral">{s.resourceCount} resources</Pill>
              <Pill tone="ok">{s.streak}-day streak</Pill>
              <Pill tone={s.next.urgency}>Next: {s.next.due}</Pill>
            </div>
          </div>
        </div>
      </div>

      {recent && recent.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          maxWidth: 1400, margin: "12px auto 0", padding: "8px 12px",
          background: "var(--surface)", border: "1px solid var(--accent-line)",
          borderRadius: 8, fontSize: 11.5,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4,
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <span style={{ width: 11, height: 11 }}><Ic.Sparkle /></span>
          </span>
          <span className="label-xs" style={{ marginBottom: 0 }}>Just added</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
            {recent.slice(-4).map((r, i) => (
              <span key={i} style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 100,
                background: "var(--accent-soft)", color: "var(--accent)",
                border: "1px solid var(--accent-line)",
                fontSize: 11, fontWeight: 500,
              }}>
                <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)" }}>{r.kind}</span>
                {r.title}{r.due && <span style={{ color: "var(--ink-3)" }}>· {r.due}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 22, maxWidth: 1400, margin: "22px auto 0" }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 14px", borderRadius: 0, position: "relative",
              fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
              color: active ? "var(--ink)" : "var(--ink-3)",
              borderBottom: `2px solid ${active ? "var(--s)" : "transparent"}`,
              marginBottom: -1,
            }}>
              {t.label}
              {t.count != null && (
                <span className="mono tabular" style={{
                  marginLeft: 6, fontSize: 10.5, padding: "1px 5px", borderRadius: 3,
                  background: active ? "var(--s-soft)" : "var(--surface-2)",
                  color: active ? "var(--s)" : "var(--ink-3)",
                }}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MATHEMATICS WORKSPACE — formula/theorem-centric, grid-precise
// ═══════════════════════════════════════════════════════════════════════════
function MathWorkspace({ s, recent, onAdd }) {
  const [tab, setTab] = useState("problems");
  const handleAdd = (item) => { if (item.kind === "resource") setTab("resources"); else onAdd(item); };
  const tabs = [
    { id: "problems",  label: "Problem sets", count: 8 },
    { id: "theorems",  label: "Theorems",     count: 23 },
    { id: "notes",     label: "Notes" },
    { id: "pyqs",      label: "PYQs",         count: 36 },
    { id: "resources", label: "Resources" },
  ];

  return (
    <div data-subject={s.id}>
      <SubjectHeader s={s} tabs={tabs} tab={tab} setTab={setTab} recent={recent} onAdd={handleAdd} />
      <div style={{ padding: "24px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "resources" ? <ResourcesPanel subjectId={s.id} /> : <>
        {/* Unit ribbon */}
        <UnitRibbon units={MATH_UNITS} />

        {/* Three-column layout: problems | scratch/theorems | sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 22 }}>
          {/* Problem set */}
          <Card padded={false}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div className="label-xs">Active problem set</div>
                <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>
                  §4 Cauchy sequences <span className="mono" style={{ color: "var(--ink-3)", fontWeight: 400 }}>· spivak ch.7</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Pill tone="due">due tomorrow</Pill>
              </div>
            </div>
            <div style={{ padding: "6px 0" }}>
              {MATH_PROBLEMS.map((p, i) => <ProblemRow key={p.n} p={p} first={i === 0} />)}
            </div>
          </Card>

          {/* Theorems */}
          <Card padded={false}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div className="label-xs">Theorem reference</div>
                <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Compendium</div>
              </div>
              <Btn icon={Ic.Sparkle} variant="ghost">Recall test</Btn>
            </div>
            <div style={{ padding: "10px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {MATH_THEOREMS.map(t => <TheoremBlock key={t.n} t={t} />)}
            </div>
            <div style={{
              padding: "12px 18px", borderTop: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}>
              <div className="label-xs" style={{ marginBottom: 6 }}>Quick formula</div>
              <div className="mono" style={{
                fontSize: "var(--fs-15)", color: "var(--code-ink)",
                padding: "8px 12px", background: "var(--code-bg)",
                borderRadius: "var(--r-sm)", border: "1px solid var(--line)",
                fontFeatureSettings: '"ss01"',
                lineHeight: 1.6,
              }}>
                ∀ε &gt; 0, ∃N ∈ ℕ : m,n ≥ N ⟹ |a_m − a_n| &lt; ε
              </div>
            </div>
          </Card>
        </div>
        </>}
      </div>
    </div>
  );
}

function UnitRibbon({ units }) {
  return (
    <Card padded={false}>
      <div style={{
        display: "grid", gridTemplateColumns: `repeat(${units.length}, 1fr)`,
        position: "relative",
      }}>
        {units.map((u, i) => (
          <div key={u.n} style={{
            padding: "14px 16px",
            borderRight: i < units.length - 1 ? "1px solid var(--line-soft)" : "none",
            background: u.current ? "var(--s-soft)" : "transparent",
            position: "relative",
          }}>
            {u.current && (
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "var(--s)" }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span className="mono" style={{
                fontSize: 10, color: u.done ? "var(--ok)" : u.current ? "var(--s)" : "var(--ink-3)",
              }}>{u.n}</span>
              {u.done && <span style={{ width: 12, height: 12, color: "var(--ok)" }}><Ic.Check /></span>}
              {u.current && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--s)", animation: "ll-pulse-soft 1.6s infinite" }} />}
            </div>
            <div style={{
              fontSize: "var(--fs-13)", fontWeight: u.current ? 500 : 400,
              color: u.done ? "var(--ink-3)" : "var(--ink)",
              textDecoration: u.done ? "line-through" : "none",
              lineHeight: 1.3,
            }}>{u.title}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }} className="mono">{u.problems} pr.</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProblemRow({ p, first }) {
  const tone = { done: "var(--ok)", doing: "var(--accent)", todo: "var(--ink-4)" }[p.status];
  const diffMap = { easy: "I", med: "II", hard: "III" };
  const diffColor = { easy: "var(--ok)", med: "var(--warn)", hard: "var(--due)" }[p.diff];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "auto auto 1fr auto auto",
      gap: 12, alignItems: "center", padding: "9px 18px",
      borderTop: first ? "none" : "1px solid var(--line-soft)",
    }}>
      <span className="mono tabular" style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 26 }}>{p.n}</span>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: tone }} />
      <span className="serif" style={{
        fontFamily: "var(--font-serif)", fontSize: "var(--fs-14)",
        color: p.status === "done" ? "var(--ink-3)" : "var(--ink)",
        textDecoration: p.status === "done" ? "line-through" : "none",
      }}>{p.text}</span>
      <span className="mono" style={{ fontSize: 10.5, color: diffColor, fontWeight: 500 }}>
        {diffMap[p.diff]}
      </span>
      <button style={{
        fontSize: 11, color: "var(--ink-3)", padding: "3px 8px",
        border: "1px solid var(--line)", borderRadius: 3,
      }}>open</button>
    </div>
  );
}

function TheoremBlock({ t }) {
  return (
    <div style={{
      padding: "10px 12px", borderLeft: "2px solid var(--s)",
      background: "var(--surface-2)", borderRadius: "0 var(--r-sm) var(--r-sm) 0",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--s)", fontWeight: 500 }}>Theorem {t.n}</span>
        <span style={{ fontSize: "var(--fs-13)", fontWeight: 500 }}>{t.name}</span>
      </div>
      <div className="serif" style={{
        fontFamily: "var(--font-serif)", fontSize: "var(--fs-13)",
        color: "var(--ink-2)", lineHeight: 1.5,
      }}>
        {t.body}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMMING WORKSPACE — IDE/terminal-oriented
// ═══════════════════════════════════════════════════════════════════════════
function ProgWorkspace({ s, recent, onAdd }) {
  const [tab, setTab] = useState("code");
  const handleAdd = (item) => { if (item.kind === "resource") setTab("resources"); else onAdd(item); };
  const tabs = [
    { id: "code",      label: "Lab workspace" },
    { id: "concepts",  label: "Concepts", count: 47 },
    { id: "psets",     label: "Problem sets", count: 7 },
    { id: "snippets",  label: "Snippets", count: 124 },
    { id: "resources", label: "Resources" },
  ];

  return (
    <div data-subject={s.id}>
      <SubjectHeader s={s} tabs={tabs} tab={tab} setTab={setTab} recent={recent} onAdd={handleAdd} />
      <div style={{ padding: "20px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "resources" ? <ResourcesPanel subjectId={s.id} /> : <>
        {/* IDE-style layout */}
        <Card padded={false} style={{ overflow: "hidden", marginBottom: 16 }}>
          {/* tab strip */}
          <div style={{
            display: "flex", alignItems: "center",
            borderBottom: "1px solid var(--line)", background: "var(--surface-2)",
            padding: "0 8px", height: 34,
          }}>
            {["rbtree.rs", "node.rs", "lec-13.md"].map((f, i) => (
              <div key={f} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "0 12px", height: "100%", fontSize: 12,
                color: i === 0 ? "var(--ink)" : "var(--ink-3)",
                background: i === 0 ? "var(--surface)" : "transparent",
                borderRight: "1px solid var(--line)",
                borderTop: i === 0 ? "2px solid var(--s)" : "2px solid transparent",
              }}>
                <span className="mono" style={{ fontSize: 11.5 }}>{f}</span>
                {i === 0 && <span style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: "var(--warn)",
                }} title="unsaved" />}
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, padding: "0 10px", fontSize: 11, color: "var(--ink-3)" }} className="mono">
              <span>UTF-8</span><span>·</span><span>LF</span><span>·</span><span>rust 1.78</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 340px", minHeight: 460 }}>
            {/* Explorer */}
            <div style={{
              borderRight: "1px solid var(--line)", background: "var(--surface-2)",
              padding: "10px 0",
            }}>
              <div className="label-xs" style={{ padding: "0 14px 6px" }}>Explorer</div>
              {PROG_FILES.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: `2.5px 14px 2.5px ${14 + f.depth * 12}px`,
                  fontSize: 12, color: f.active ? "var(--ink)" : "var(--ink-2)",
                  fontWeight: f.active ? 500 : 400,
                  background: f.active ? "var(--s-soft)" : "transparent",
                  borderLeft: f.active ? "2px solid var(--s)" : "2px solid transparent",
                }} className="mono">
                  {f.kind === "dir" ? "▸" : ""}
                  <span style={{ flex: 1 }}>{f.path.trim() || f.path}</span>
                </div>
              ))}
            </div>

            {/* Editor */}
            <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)" }}>
              <CodeBlock />
              <Terminal />
            </div>

            {/* Right pane: concept */}
            <div style={{
              borderLeft: "1px solid var(--line)", background: "var(--surface)",
              padding: "14px 16px", overflowY: "auto",
            }}>
              <div className="label-xs" style={{ marginBottom: 4 }}>Concept under study</div>
              <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, marginBottom: 10 }}>
                §13.1 RB-tree properties
              </div>
              <div className="mono" style={{
                fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.55,
                padding: 10, background: "var(--code-bg)", borderRadius: "var(--r-sm)",
                border: "1px solid var(--line)",
              }}>
{`invariants:
  1. node.color ∈ {red, black}
  2. root.color = black
  3. nil.color  = black
  4. red ⇒ children.color = black
  5. ∀ path n → nil:
       count(black) = bh(n)`}
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="label-xs" style={{ marginBottom: 6 }}>Linked notes</div>
                {[
                  { f: "lec-13.md", t: "Lecture notes" },
                  { f: "amortized.md", t: "Amortized analysis primer" },
                  { f: "CLRS-13.pdf", t: "Textbook chapter" },
                ].map((l, i) => (
                  <a key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "5px 0",
                    fontSize: 12, color: "var(--ink-2)",
                  }}>
                    <span style={{ width: 12, height: 12, color: "var(--ink-3)" }}><Ic.Note /></span>
                    <span style={{ flex: 1 }}>{l.t}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{l.f}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* status bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "5px 14px", borderTop: "1px solid var(--line)",
            background: "var(--s-soft)", color: "var(--s)",
            fontSize: 11, fontWeight: 500,
          }} className="mono">
            <span>● main</span>
            <span>+34 −12</span>
            <span style={{ color: "var(--due)" }}>1 failing test</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>Ln 87, Col 14</span>
            <span style={{ color: "var(--ink-3)" }}>Spaces: 4</span>
          </div>
        </Card>

        {/* Concept rows */}
        <SectionTitle kicker="This week's concepts" title="Chapter 13 — Red-black trees" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {PROG_CONCEPTS.map(c => <ConceptCard key={c.n} c={c} />)}
        </div>
        </>}
      </div>
    </div>
  );
}

function CodeBlock() {
  const lines = [
    { n: 1,  s: "kw", t: "impl", e: " " , t2: "<K, V>", e2: " ", t3: "RbTree", e3: "<K, V> ", t4: "where", e4: " K: ", t5: "Ord", e5: " {" },
    { n: 2 },
    { n: 3,  s: "doc", t: "    /// Insert preserving all five invariants." },
    { n: 4,  s: "kw",  t: "    pub fn", e: " insert", e2: "(&mut ", t2: "self", e3: ", k: K, v: V) -> ", t3: "Option", e4: "<V> {" },
    { n: 5,  s: "txt", t: "        ", t2: "let", e: " mut ", t3: "node", e2: " = ", t4: "Self", e3: "::new_red(k, v);" },
    { n: 6,  s: "txt", t: "        ", t2: "self", e: ".root = ", t3: "self", e2: ".bst_insert(node);" },
    { n: 7,  s: "txt", t: "        ", t2: "self", e: ".fixup(&", t3: "node", e2: ");" },
    { n: 8,  s: "txt", t: "        ", t2: "self", e: ".root.set_black();" },
    { n: 9,  s: "kw",  t: "        None" },
    { n: 10, s: "txt", t: "    }" },
    { n: 11 },
    { n: 12, s: "doc", t: "    /// Restore RB invariants after a red insertion." },
    { n: 13, s: "kw",  t: "    fn", e: " fixup(&mut ", t2: "self", e2: ", n: ", t3: "&NodeRef", e3: "<K, V>) {" },
    { n: 14, s: "kw",  t: "        while", e: " ", t2: "let Some", e2: "(p) = n.parent() ", t3: "&&", e3: " p.is_red() {" },
    { n: 15, s: "comment", t: "            // case I — uncle red: recolor & ascend" },
    { n: 16, s: "txt", t: "            ..." },
    { n: 17, s: "txt", t: "        }" },
    { n: 18, s: "txt", t: "    }" },
    { n: 19, s: "txt", t: "}" },
  ];
  const color = (s) => ({
    kw: "var(--accent)", doc: "var(--ok)", comment: "var(--ink-3)", txt: "var(--code-ink)", string: "var(--warn)",
  }[s] || "var(--code-ink)");
  return (
    <div className="mono" style={{
      padding: "12px 0", fontSize: 12.5, lineHeight: 1.6,
      background: "var(--surface)", flex: 1, overflowX: "auto",
    }}>
      {lines.map((ln) => (
        <div key={ln.n} style={{
          display: "grid", gridTemplateColumns: "44px 1fr",
          padding: "0", color: color(ln.s),
          background: ln.n === 4 ? "color-mix(in oklch, var(--s-soft) 50%, transparent)" : "transparent",
        }}>
          <span style={{ textAlign: "right", paddingRight: 12, color: "var(--ink-4)", userSelect: "none", fontSize: 11 }}>
            {ln.n}
          </span>
          <span style={{ whiteSpace: "pre", color: color(ln.s) }}>
            {ln.t}
            {ln.e   && <span style={{ color: "var(--code-ink)" }}>{ln.e}</span>}
            {ln.t2  && <span style={{ color: color(ln.s === "kw" ? "txt" : ln.s) }}>{ln.t2}</span>}
            {ln.e2  && <span style={{ color: "var(--code-ink)" }}>{ln.e2}</span>}
            {ln.t3  && <span style={{ color: color(ln.s === "kw" ? "txt" : ln.s) }}>{ln.t3}</span>}
            {ln.e3  && <span style={{ color: "var(--code-ink)" }}>{ln.e3}</span>}
            {ln.t4  && <span style={{ color: color(ln.s === "kw" ? "txt" : ln.s) }}>{ln.t4}</span>}
            {ln.e4  && <span style={{ color: "var(--code-ink)" }}>{ln.e4}</span>}
            {ln.t5  && <span style={{ color: color(ln.s === "kw" ? "txt" : ln.s) }}>{ln.t5}</span>}
            {ln.e5  && <span style={{ color: "var(--code-ink)" }}>{ln.e5}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Terminal() {
  return (
    <div className="mono" style={{
      borderTop: "1px solid var(--line)",
      background: "var(--bg-sunken)", padding: "10px 14px",
      fontSize: 11.5, lineHeight: 1.65, color: "var(--ink-2)",
      height: 180, overflowY: "auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--ink-3)", fontSize: 10.5 }} className="label-xs">
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ok)" }} />
        terminal · zsh
      </div>
      {PROG_TERMINAL.map((l, i) => (
        <div key={i} style={{
          color: l.kind === "prompt" ? "var(--ink)"
                : l.kind === "ok" ? "var(--ok)"
                : l.kind === "fail" ? "var(--due)"
                : "var(--ink-2)",
        }}>
          {l.kind === "prompt" && <span style={{ color: "var(--s)" }}>~/algo-lab ❯ </span>}
          {l.text}
          {l.kind === "prompt" && i === PROG_TERMINAL.length - 1 && (
            <span style={{ display: "inline-block", width: 6, height: 11, background: "var(--ink)", marginLeft: 2, verticalAlign: "middle", animation: "ll-caret 1s steps(2) infinite" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ConceptCard({ c }) {
  return (
    <Card style={{ padding: 0 }} accent>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--s)" }}>§{c.n}</span>
        <span style={{ fontSize: "var(--fs-14)", fontWeight: 500 }}>{c.title}</span>
      </div>
      <div style={{ padding: "12px 14px", fontSize: "var(--fs-13)", color: "var(--ink-2)", lineHeight: 1.55 }}>
        {c.body}
      </div>
    </Card>
  );
}

// ── Subject Resources Panel ────────────────────────────────────────────────
function ResourcesPanel({ subjectId }) {
  const { resources, addPDF, addLink, deleteResource, updateLink } = useSubjectResources(subjectId);
  const [mode, setMode] = useState(null);
  const [linkDraft, setLinkDraft] = useState({ name: "", url: "" });
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: "", url: "" });
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const pdfs = resources.filter(r => r.type === "pdf");
  const links = resources.filter(r => r.type === "link");

  const triggerPDF = () => { setMode("pdf"); setTimeout(() => fileRef.current?.click(), 40); };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addPDF(file, setError);
    setMode(null);
    e.target.value = "";
  };

  const handleLinkSave = () => {
    if (!linkDraft.name.trim() || !linkDraft.url.trim()) return;
    addLink({ name: linkDraft.name.trim(), url: linkDraft.url.trim() });
    setLinkDraft({ name: "", url: "" });
    setMode(null);
  };

  const handleEditSave = () => {
    if (!editDraft.name.trim() || !editDraft.url.trim()) return;
    updateLink(editId, { name: editDraft.name.trim(), url: editDraft.url.trim() });
    setEditId(null);
  };

  const openItem = (r) => {
    if (r.type === "pdf") {
      if (!r.dataUrl) return;
      try {
        const [, base64] = r.dataUrl.split(",");
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, "_blank", "noopener,noreferrer");
        if (win) setTimeout(() => URL.revokeObjectURL(url), 30000);
      } catch { window.open(r.dataUrl, "_blank", "noopener,noreferrer"); }
    } else {
      if (!r.url) return;
      window.open(r.url, "_blank", "noopener,noreferrer");
    }
  };

  const downloadPDF = (r) => {
    if (!r.dataUrl) return;
    const a = document.createElement("a");
    a.href = r.dataUrl; a.download = r.name; a.click();
  };

  const inputStyle = {
    padding: "8px 11px", border: "1px solid var(--line)", borderRadius: "var(--r)",
    fontSize: "var(--fs-14)", background: "var(--surface)", color: "var(--ink)", width: "100%", boxSizing: "border-box",
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleFileChange} />

      {error && (
        <div style={{
          marginBottom: 14, padding: "9px 14px", borderRadius: "var(--r-sm)",
          background: "var(--due-soft)", color: "var(--due)",
          fontSize: "var(--fs-13)", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ color: "var(--due)", fontWeight: 700, lineHeight: 1, marginLeft: 12 }}>×</button>
        </div>
      )}

      {resources.length === 0 && mode === null ? (
        <div style={{
          padding: "48px 32px", border: "1px dashed var(--line)", borderRadius: "var(--r-lg)",
          textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
        }}>
          <span style={{ width: 40, height: 40, borderRadius: "var(--r)", background: "var(--surface-2)", color: "var(--ink-3)", display: "grid", placeItems: "center" }}>
            <span style={{ width: 20, height: 20 }}><Ic.Books /></span>
          </span>
          <div>
            <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, marginBottom: 4 }}>No resources yet</div>
            <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-3)" }}>Upload PDFs or save useful links for this subject.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn icon={Ic.Upload} variant="primary" onClick={triggerPDF}>Upload PDF</Btn>
            <Btn icon={Ic.Plus} onClick={() => setMode("link")}>Add Link</Btn>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <Btn icon={Ic.Upload} variant="primary" onClick={triggerPDF}>Upload PDF</Btn>
            <Btn icon={Ic.Plus} onClick={() => setMode("link")}>Add Link</Btn>
          </div>

          {mode === "link" && (
            <Card style={{ padding: "14px 18px", marginBottom: 18, animation: "ll-fade-in 140ms ease" }}>
              <div className="label-xs" style={{ marginBottom: 10 }}>New link</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input autoFocus value={linkDraft.name}
                  onChange={e => setLinkDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="Title — e.g. MIT OCW" style={inputStyle} />
                <input value={linkDraft.url}
                  onChange={e => setLinkDraft(d => ({ ...d, url: e.target.value }))}
                  placeholder="https://..."
                  onKeyDown={e => e.key === "Enter" && handleLinkSave()}
                  style={inputStyle} />
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <Btn variant="ghost" onClick={() => { setMode(null); setLinkDraft({ name: "", url: "" }); }}>Cancel</Btn>
                  <Btn variant="primary" onClick={handleLinkSave}>Save link</Btn>
                </div>
              </div>
            </Card>
          )}

          {pdfs.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="label-xs" style={{ marginBottom: 8 }}>PDFs · {pdfs.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pdfs.map(r => (
                  <Card key={r.id} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--due-soft)", color: "var(--due)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <span style={{ width: 16, height: 16 }}><Ic.Pdf /></span>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                        {r.date}{r.size ? ` · ${(r.size / 1024).toFixed(0)} KB` : ""}
                        {r.indexed && <span style={{ color: "var(--ok)", marginLeft: 6 }}>· AI indexed</span>}
                        {r.pdfId === null && r.indexed === false && <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>· indexing…</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Btn variant="ghost" onClick={() => openItem(r)}>Read</Btn>
                      <Btn variant="ghost" onClick={() => downloadPDF(r)}>Download</Btn>
                      <button onClick={() => deleteResource(r.id)}
                        style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", color: "var(--ink-3)", display: "grid", placeItems: "center" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--due)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--ink-3)"}>
                        <span style={{ width: 14, height: 14 }}><Ic.Trash /></span>
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div className="label-xs" style={{ marginBottom: 8 }}>Links · {links.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {links.map(r => (
                  editId === r.id ? (
                    <Card key={r.id} style={{ padding: "12px 16px", animation: "ll-fade-in 140ms ease" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input autoFocus value={editDraft.name}
                          onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                          placeholder="Title" style={inputStyle} />
                        <input value={editDraft.url}
                          onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))}
                          placeholder="https://..."
                          onKeyDown={e => e.key === "Enter" && handleEditSave()}
                          style={inputStyle} />
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <Btn variant="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
                          <Btn variant="primary" onClick={handleEditSave}>Save</Btn>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card key={r.id} style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <span style={{ width: 16, height: 16 }}><Ic.Globe /></span>
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.url}</div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <Btn variant="ghost" onClick={() => openItem(r)}>Open</Btn>
                        <Btn variant="ghost" onClick={() => { setEditId(r.id); setEditDraft({ name: r.name, url: r.url }); }}>Edit</Btn>
                        <button onClick={() => deleteResource(r.id)}
                          style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", color: "var(--ink-3)", display: "grid", placeItems: "center" }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--due)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--ink-3)"}>
                          <span style={{ width: 14, height: 14 }}><Ic.Trash /></span>
                        </button>
                      </div>
                    </Card>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BIOLOGY WORKSPACE — diagram-heavy
// ═══════════════════════════════════════════════════════════════════════════
function BioWorkspace({ s, recent, onAdd }) {
  const [tab, setTab] = useState("diagrams");
  const handleAdd = (item) => { if (item.kind === "resource") setTab("resources"); else onAdd(item); };
  const tabs = [
    { id: "diagrams",  label: "Diagrams", count: 24 },
    { id: "reading",   label: "Reading" },
    { id: "lab",       label: "Lab notebook" },
    { id: "cards",     label: "Flashcards", count: 612 },
    { id: "glossary",  label: "Glossary",   count: 287 },
    { id: "resources", label: "Resources" },
  ];
  return (
    <div data-subject={s.id}>
      <SubjectHeader s={s} tabs={tabs} tab={tab} setTab={setTab} recent={recent} onAdd={handleAdd} />
      <div style={{ padding: "24px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "resources" ? <ResourcesPanel subjectId={s.id} /> : <>
        <SectionTitle kicker="Active unit" title="Unit 06 · Membrane transport"
          action={<div style={{ display: "flex", gap: 6 }}>
            <Pill subject={s.id} tone="subject">9 diagrams</Pill>
            <Pill tone="warn">28 cards · 6 weak</Pill>
          </div>}
        />
        {/* diagram gallery */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {BIO_DIAGRAMS.map((d, i) => <DiagramCard key={d.id} d={d} featured={i === 0} />)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 24 }}>
          <Card padded={false}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
            }}>
              <div>
                <div className="label-xs">Currently reading</div>
                <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>
                  Alberts — Molecular Biology of the Cell, Ch. 12
                </div>
              </div>
              <Pill tone="neutral">p. 612 / 743</Pill>
            </div>
            <ReadingBlock />
          </Card>

          {/* glossary */}
          <Card padded={false}>
            <div style={{
              padding: "14px 18px", borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div className="label-xs">Subject glossary</div>
                <div style={{ fontSize: "var(--fs-18)", fontWeight: 500, letterSpacing: "-0.01em" }}>Key terms</div>
              </div>
              <Btn icon={Ic.Search} variant="ghost" style={{ padding: "4px 8px" }}> </Btn>
            </div>
            <div style={{ padding: "4px 0" }}>
              {BIO_GLOSSARY.map((g, i) => (
                <div key={g.term} style={{
                  padding: "10px 18px", borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                }}>
                  <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, marginBottom: 3 }}>{g.term}</div>
                  <div style={{ fontSize: "var(--fs-13)", color: "var(--ink-2)", lineHeight: 1.45 }}>{g.body}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        </>}
      </div>
    </div>
  );
}

function DiagramCard({ d, featured }) {
  return (
    <Card style={{ padding: 0, gridColumn: featured ? "span 2" : "auto" }}>
      <div style={{
        height: featured ? 200 : 140, background: "var(--surface-2)",
        borderBottom: "1px solid var(--line-soft)", position: "relative", overflow: "hidden",
      }}>
        <DiagramSvg id={d.id} />
        <div style={{
          position: "absolute", top: 10, left: 10,
          display: "flex", gap: 6,
        }}>
          <Pill tone="neutral" style={{ background: "color-mix(in oklch, var(--surface) 80%, transparent)" }}>
            {d.type}
          </Pill>
        </div>
        <div style={{
          position: "absolute", bottom: 8, right: 10,
          fontSize: 10.5, color: "var(--ink-3)", padding: "2px 6px",
          background: "color-mix(in oklch, var(--surface) 80%, transparent)",
          borderRadius: 3,
        }} className="mono">
          {d.studied}/{d.parts} parts
        </div>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, marginBottom: 6 }}>{d.title}</div>
        <div style={{ height: 3, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(d.studied / d.parts) * 100}%`, height: "100%", background: "var(--s)" }} />
        </div>
      </div>
    </Card>
  );
}

function DiagramSvg({ id }) {
  // schematic placeholders — each subject diagram has its own visual grammar
  const stroke = "var(--s)";
  const soft = "var(--s-soft)";
  if (id === "membrane") {
    return (
      <svg viewBox="0 0 400 200" style={{ width: "100%", height: "100%" }}>
        <rect width="400" height="200" fill="var(--surface-2)"/>
        {/* phospholipid bilayer */}
        <g stroke={stroke} fill={soft} strokeWidth="1">
          {Array.from({ length: 32 }).map((_, i) => (
            <g key={i} transform={`translate(${i * 12 + 10}, 0)`}>
              <circle cx="0" cy="74" r="5" />
              <line x1="0" y1="79" x2="-2" y2="100" />
              <line x1="0" y1="79" x2="2" y2="100" />
              <line x1="0" y1="121" x2="-2" y2="100" />
              <line x1="0" y1="121" x2="2" y2="100" />
              <circle cx="0" cy="126" r="5" />
            </g>
          ))}
        </g>
        {/* embedded protein */}
        <rect x="160" y="60" width="44" height="80" rx="6" fill={soft} stroke={stroke} strokeWidth="1.5"/>
        <rect x="166" y="80" width="32" height="40" rx="3" fill="var(--surface)" stroke={stroke} strokeWidth="0.8"/>
        {/* labels */}
        <g fontFamily="monospace" fontSize="9" fill="var(--ink-3)">
          <line x1="220" y1="100" x2="260" y2="100" stroke="var(--ink-3)" strokeDasharray="2 2"/>
          <text x="264" y="103">channel protein</text>
          <line x1="80" y1="50" x2="80" y2="65" stroke="var(--ink-3)" strokeDasharray="2 2"/>
          <text x="60" y="44">hydrophilic head</text>
          <line x1="80" y1="155" x2="80" y2="135" stroke="var(--ink-3)" strokeDasharray="2 2"/>
          <text x="50" y="170">hydrophobic tail</text>
        </g>
      </svg>
    );
  }
  if (id === "krebs") {
    return (
      <svg viewBox="0 0 240 140" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="140" fill="var(--surface-2)"/>
        <circle cx="120" cy="70" r="42" fill="none" stroke={stroke} strokeWidth="1.2" strokeDasharray="3 3"/>
        {[0, 60, 120, 180, 240, 300].map((a, i) => {
          const x = 120 + Math.cos((a - 90) * Math.PI / 180) * 42;
          const y = 70 + Math.sin((a - 90) * Math.PI / 180) * 42;
          return <circle key={i} cx={x} cy={y} r="6" fill={soft} stroke={stroke}/>;
        })}
        <text x="120" y="73" textAnchor="middle" fontFamily="serif" fontSize="11" fill="var(--ink-2)" fontStyle="italic">citric acid cycle</text>
      </svg>
    );
  }
  if (id === "ribosome") {
    return (
      <svg viewBox="0 0 240 140" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="140" fill="var(--surface-2)"/>
        <ellipse cx="120" cy="60" rx="50" ry="28" fill={soft} stroke={stroke}/>
        <ellipse cx="120" cy="90" rx="60" ry="34" fill={soft} stroke={stroke}/>
        <line x1="40" y1="78" x2="200" y2="78" stroke={stroke} strokeWidth="1"/>
      </svg>
    );
  }
  if (id === "mitosis") {
    return (
      <svg viewBox="0 0 240 140" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="140" fill="var(--surface-2)"/>
        {[0,1,2,3].map(i => (
          <g key={i} transform={`translate(${30 + i*55}, 70)`}>
            <circle r="22" fill="none" stroke={stroke}/>
            {i < 2 && <path d={`M-8 0 Q 0 ${i===0?-12:-6} 8 0`} fill="none" stroke={stroke} strokeWidth="1.5"/>}
            {i >= 2 && <g><circle cx="-10" cy="0" r="5" fill={soft} stroke={stroke}/><circle cx="10" cy="0" r="5" fill={soft} stroke={stroke}/></g>}
          </g>
        ))}
      </svg>
    );
  }
  if (id === "neuron") {
    return (
      <svg viewBox="0 0 240 140" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="140" fill="var(--surface-2)"/>
        <circle cx="50" cy="70" r="20" fill={soft} stroke={stroke}/>
        {[0,45,90,135,180,225,315].map(a => {
          const x = 50 + Math.cos(a*Math.PI/180) * 28;
          const y = 70 + Math.sin(a*Math.PI/180) * 28;
          return <line key={a} x1="50" y1="70" x2={x} y2={y} stroke={stroke} strokeWidth="1.2"/>;
        })}
        <line x1="70" y1="70" x2="210" y2="70" stroke={stroke} strokeWidth="2"/>
        {[100, 130, 160, 190].map(x => <ellipse key={x} cx={x} cy={70} rx="10" ry="6" fill={soft} stroke={stroke}/>)}
        <circle cx="210" cy="70" r="3" fill={stroke}/>
      </svg>
    );
  }
  if (id === "transcription") {
    return (
      <svg viewBox="0 0 240 140" style={{ width: "100%", height: "100%" }}>
        <rect width="240" height="140" fill="var(--surface-2)"/>
        <line x1="20" y1="60" x2="220" y2="60" stroke={stroke} strokeWidth="1.5"/>
        <line x1="20" y1="80" x2="220" y2="80" stroke={stroke} strokeWidth="1.5"/>
        {Array.from({length: 20}).map((_,i) => <line key={i} x1={25+i*10} y1="60" x2={25+i*10} y2="80" stroke={stroke} strokeWidth="0.5"/>)}
        <ellipse cx="120" cy="70" rx="36" ry="22" fill={soft} stroke={stroke} strokeWidth="1.5"/>
        <path d="M 120 92 Q 140 110, 180 110" fill="none" stroke={stroke} strokeWidth="1.5"/>
      </svg>
    );
  }
  return null;
}

function ReadingBlock() {
  const para = `Membrane transport proteins fall into two large classes: transporters and channels. Transporters bind specific solutes and undergo a series of conformational changes that alternately expose the solute-binding site on opposite sides of the lipid bilayer. Channels, by contrast, form continuous protein-lined pores that, when open, allow specific ions to flow across the membrane at rates approaching those of free diffusion.`;
  return (
    <div style={{ padding: "18px 22px 20px", display: "grid", gridTemplateColumns: "1fr 200px", gap: 18 }}>
      <div className="serif" style={{
        fontFamily: "var(--font-serif)", fontSize: 16, lineHeight: 1.65,
        color: "var(--ink)", textWrap: "pretty",
      }}>
        <p style={{ marginBottom: 12 }}>{para}</p>
        <p style={{ marginBottom: 12, color: "var(--ink-2)" }}>
          The {" "}
          <mark style={{ background: "var(--s-soft)", color: "var(--ink)", padding: "0 3px", borderBottom: "1px solid var(--s)" }}>
            sodium gradient
          </mark>{" "}
          across the plasma membrane is generated and maintained by the Na⁺/K⁺ ATPase pump, which uses ATP hydrolysis to drive Na⁺ out of the cell and K⁺ in against their electrochemical gradients.
        </p>
        <p style={{ color: "var(--ink-2)" }}>
          This stored energy is then harvested by{" "}
          <mark style={{ background: "color-mix(in oklch, var(--warn) 12%, transparent)", padding: "0 3px" }}>
            symporters
          </mark>{" "}
          and antiporters to move other solutes — sugars, amino acids, neurotransmitters — across the membrane.
        </p>
      </div>
      <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 14 }}>
        <div className="label-xs" style={{ marginBottom: 8 }}>Annotations · 2</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "8px 10px", background: "var(--s-soft)", borderRadius: "var(--r-sm)", border: "1px solid var(--s-line)" }}>
            <div style={{ fontSize: 11, color: "var(--s)", fontWeight: 500, marginBottom: 2 }}>thesis</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Two-class taxonomy — likely exam definition.</div>
          </div>
          <div style={{ padding: "8px 10px", background: "var(--warn-soft)", borderRadius: "var(--r-sm)", border: "1px solid color-mix(in oklch, var(--warn) 30%, var(--line))" }}>
            <div style={{ fontSize: 11, color: "var(--warn)", fontWeight: 500, marginBottom: 2 }}>review</div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>Cross-check antiport vs symport — fuzzy.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LITERATURE WORKSPACE — reading/annotation-centric
// ═══════════════════════════════════════════════════════════════════════════
function LitWorkspace({ s, recent, onAdd }) {
  const [tab, setTab] = useState("text");
  const handleAdd = (item) => { if (item.kind === "resource") setTab("resources"); else onAdd(item); };
  const tabs = [
    { id: "text",      label: "Text" },
    { id: "essay",     label: "Essay draft" },
    { id: "themes",    label: "Themes", count: 7 },
    { id: "context",   label: "Historical context" },
    { id: "resources", label: "Resources" },
  ];

  return (
    <div data-subject={s.id}>
      <SubjectHeader s={s} tabs={tabs} tab={tab} setTab={setTab} recent={recent} onAdd={handleAdd} />
      <div style={{ padding: "24px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "resources" ? <ResourcesPanel subjectId={s.id} /> :
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 320px", gap: 18 }}>
          {/* Left: outline */}
          <div>
            <div className="label-xs" style={{ marginBottom: 8 }}>Mrs Dalloway</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                { p: "p. 3",   t: "Opening — Bond St.",  active: true },
                { p: "p. 47",  t: "Septimus in park" },
                { p: "p. 88",  t: "Peter Walsh returns" },
                { p: "p. 132", t: "Bourton recollection" },
                { p: "p. 165", t: "Septimus' suicide" },
                { p: "p. 201", t: "Party scene" },
              ].map(o => (
                <button key={o.p} style={{
                  textAlign: "left", padding: "6px 10px", borderRadius: 4,
                  background: o.active ? "var(--s-soft)" : "transparent",
                  color: o.active ? "var(--ink)" : "var(--ink-2)",
                  fontSize: "var(--fs-13)", fontWeight: o.active ? 500 : 400,
                  borderLeft: o.active ? "2px solid var(--s)" : "2px solid transparent",
                }}>
                  <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginRight: 6 }}>{o.p}</span>
                  {o.t}
                </button>
              ))}
            </div>

            <div className="label-xs" style={{ marginTop: 22, marginBottom: 8 }}>Highlight legend</div>
            {[
              { c: "var(--s)",      l: "thesis · §1" },
              { c: "var(--warn)",   l: "image / motif" },
              { c: "var(--accent)", l: "voice / style" },
              { c: "var(--ink-3)",  l: "context note" },
            ].map(g => (
              <div key={g.l} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ink-2)", padding: "4px 0" }}>
                <span style={{ width: 12, height: 4, background: g.c, borderRadius: 1 }} />
                {g.l}
              </div>
            ))}
          </div>

          {/* Center: passage */}
          <Card padded={false}>
            <div style={{
              padding: "14px 22px", borderBottom: "1px solid var(--line)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div className="serif" style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", color: "var(--ink-2)" }}>
                Mrs Dalloway · Hogarth Press, 1925 · pp. 3–4
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn icon={Ic.Bookmark} variant="ghost">Annotate</Btn>
                <Btn icon={Ic.Sparkle} variant="ghost">Define</Btn>
              </div>
            </div>
            <div style={{ padding: "32px 56px 40px" }}>
              <div className="serif" style={{
                fontFamily: "var(--font-serif)", fontSize: 18, lineHeight: 1.85,
                color: "var(--ink)", textWrap: "pretty", maxWidth: 540, margin: "0 auto",
              }}>
                {LIT_PASSAGE.map((line, i) => {
                  const anno = LIT_ANNOTATIONS.find(a => a.line === i);
                  const colors = {
                    thesis: { bg: "var(--s-soft)", b: "var(--s)" },
                    image:  { bg: "color-mix(in oklch, var(--warn) 14%, transparent)", b: "var(--warn)" },
                    voice:  { bg: "var(--accent-soft)", b: "var(--accent)" },
                  };
                  if (!anno) return <p key={i} style={{ marginBottom: 14 }}>{line}</p>;
                  const c = colors[anno.color] || colors.thesis;
                  return (
                    <p key={i} style={{
                      marginBottom: 14,
                      background: c.bg,
                      borderLeft: `3px solid ${c.b}`,
                      padding: "6px 14px",
                      borderRadius: "0 4px 4px 0",
                      marginLeft: -14,
                    }}>{line}</p>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Right: annotations + thesis */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card padded={false}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div className="label-xs">Working thesis</div>
                <div style={{ fontSize: "var(--fs-14)", fontWeight: 500, marginTop: 4 }}>The fragmented self</div>
              </div>
              <div style={{ padding: "12px 16px" }} className="serif">
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55, fontStyle: "italic" }}>
                  Woolf's free indirect style braids consciousness with the urban exterior so that the self — &#x201C;Clarissa Dalloway&#x201D; — emerges as a chain of plunges across the threshold of interior and world.
                </p>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)" }} className="mono">
                  Last edited 14:02 · 1,247 / 1,500 words
                </div>
              </div>
            </Card>

            <Card padded={false}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <div className="label-xs">Annotations · this passage</div>
              </div>
              <div>
                {LIT_ANNOTATIONS.map((a, i) => {
                  const meta = {
                    thesis: { c: "var(--s)",     l: "Thesis" },
                    image:  { c: "var(--warn)",  l: "Image" },
                    voice:  { c: "var(--accent)",l: "Voice" },
                  }[a.color];
                  return (
                    <div key={i} style={{
                      padding: "10px 16px",
                      borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: meta.c }} />
                        <span style={{ fontSize: 11, color: meta.c, fontWeight: 500 }}>{meta.l}</span>
                        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>·line {a.line + 1}</span>
                      </div>
                      <div className="serif" style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                        {a.note}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC (phys, chem, hist) — uses dashboard-style layout
// ═══════════════════════════════════════════════════════════════════════════
function GenericSubject({ s, recent, onAdd }) {
  const [tab, setTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const handleAdd = (item) => { if (item.kind === "resource") setTab("resources"); else onAdd(item); };
  const tabs = [
    { id: "notes",     label: "Notes",     count: notes.length || undefined },
    { id: "practice",  label: "Practice" },
    { id: "resources", label: "Resources" },
  ];
  const colorVars = !SUBJECT_ICONS[s.id] ? getCustomColorVars(s.color) : {};

  const addNote = () => {
    const t = noteInput.trim();
    if (!t) return;
    setNotes(n => [{ id: Date.now(), text: t, ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...n]);
    setNoteInput("");
  };

  return (
    <div data-subject={s.id} style={colorVars}>
      <SubjectHeader s={s} tabs={tabs} tab={tab} setTab={setTab} recent={recent} onAdd={handleAdd} />
      <div style={{ padding: "24px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "notes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNote()}
                placeholder={`Quick note for ${s.name}…`}
                style={{
                  flex: 1, padding: "10px 13px", border: "1px solid var(--line)",
                  borderRadius: "var(--r)", fontSize: "var(--fs-14)",
                  background: "var(--surface)", color: "var(--ink)",
                }}
              />
              <button onClick={addNote} style={{
                padding: "10px 16px", borderRadius: "var(--r)",
                background: "var(--s)", color: "var(--on-accent)",
                fontSize: "var(--fs-13)", fontWeight: 500,
              }}>Add</button>
            </div>
            {notes.length === 0 ? (
              <div style={{
                padding: 32, border: "1px dashed var(--line)", borderRadius: "var(--r-lg)",
                textAlign: "center", color: "var(--ink-3)", fontSize: "var(--fs-14)",
              }}>
                No notes yet — type above and press Enter to add one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {notes.map(n => (
                  <Card key={n.id} style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, fontSize: "var(--fs-14)", lineHeight: 1.6 }}>{n.text}</div>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", flexShrink: 0, paddingTop: 2 }}>{n.ts}</span>
                    <button onClick={() => setNotes(ns => ns.filter(x => x.id !== n.id))}
                      style={{ width: 18, height: 18, color: "var(--ink-4)", flexShrink: 0 }}><Ic.X /></button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        {tab === "resources" && <ResourcesPanel subjectId={s.id} />}
        {tab !== "notes" && tab !== "resources" && (
          <div style={{
            padding: 32, border: "1px dashed var(--line)", borderRadius: "var(--r-lg)",
            textAlign: "center", color: "var(--ink-3)", fontSize: "var(--fs-14)",
          }}>
            Use the <strong>Add</strong> button above to populate {tab} for {s.name}.
          </div>
        )}
      </div>
    </div>
  );
}

// Subject router
function SubjectRouter({ id }) {
  const d = useAppData();
  const s = d.subjects.find(x => x.id === id);
  const [recents, setRecents] = useState({});
  if (!s) return null;
  const onAdd = (item) => {
    setRecents(rec => ({ ...rec, [s.id]: [...(rec[s.id] || []), item] }));
  };
  const recent = recents[s.id] || [];
  if (s.id === "math") return <MathWorkspace s={s} recent={recent} onAdd={onAdd} />;
  if (s.id === "prog") return <ProgWorkspace s={s} recent={recent} onAdd={onAdd} />;
  if (s.id === "bio")  return <BioWorkspace  s={s} recent={recent} onAdd={onAdd} />;
  if (s.id === "lit")  return <LitWorkspace  s={s} recent={recent} onAdd={onAdd} />;
  return <GenericSubject s={s} recent={recent} onAdd={onAdd} />;
}

export {
  SubjectRouter,
  MathWorkspace,
  ProgWorkspace,
  BioWorkspace,
  LitWorkspace,
};
