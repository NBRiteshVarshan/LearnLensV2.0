import React, { useState, useRef, useEffect } from "react";
import { useAppData } from "./data.js";
import { Card, Pill, Btn, Ic } from "./Shell.jsx";
import { emitAIActivity, useAnalytics } from "./useStudyAnalytics.jsx";

function AITools() {
  const d = useAppData();
  const [tab, setTab] = useState("ask");
  const [pdfs, setPdfs] = useState(d.demo ? [
    { id: "p1", name: "Spivak_Calculus_Ch7.pdf", chunks: 84, t: "2h ago" },
    { id: "p2", name: "CLRS_Ch13_RBtrees.pdf",   chunks: 62, t: "Yesterday" },
    { id: "p3", name: "Alberts_Ch12.pdf",         chunks: 118, t: "Mon" },
  ] : []);
  const [selected, setSelected] = useState(d.demo ? ["p1", "p2"] : []);

  const tabs = [
    { id: "upload",  label: "Upload & index", icon: Ic.Upload,  hint: "PDFs → chunks → embeddings" },
    { id: "ask",     label: "Ask AI",          icon: Ic.Sparkle, hint: "Grounded RAG over your notes" },
    { id: "summary", label: "Summarise",       icon: Ic.Note,    hint: "Synthesise across documents" },
    { id: "quiz",    label: "Quiz",            icon: Ic.Quiz,    hint: "10-Q MCQ with PYQ mode" },
  ];

  return (
    <div style={{ padding: "28px 32px 60px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div className="label-xs" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            AI Tools
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "1px 6px", borderRadius: 100,
              background: "var(--ok-soft)", color: "var(--ok)",
              border: "1px solid color-mix(in oklch, var(--ok) 30%, var(--line))",
              fontSize: 10, fontWeight: 500, textTransform: "none", letterSpacing: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ok)",
                animation: "ll-pulse-soft 1.6s infinite" }} />
              backend connected · llama-3.3-70b
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "var(--fs-28)", letterSpacing: "-0.02em" }}>
            Talk to your notes
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
          <span className="mono">temp 0.3</span>
          <span>·</span>
          <span className="mono">k=6</span>
          <span>·</span>
          <span className="mono">ctx ≤ 5500</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card padded={false}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
              <div className="label-xs">Tools</div>
            </div>
            <div style={{ padding: 6 }}>
              {tabs.map(t => {
                const active = tab === t.id;
                const I = t.icon;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
                    padding: "10px 12px", borderRadius: 8, textAlign: "left",
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: `1px solid ${active ? "var(--accent-line)" : "transparent"}`,
                  }}
                    onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--surface-2)")}
                    onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}>
                    <span style={{ width: 18, height: 18, color: active ? "var(--accent)" : "var(--ink-3)", marginTop: 1 }}><I /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--fs-14)", fontWeight: active ? 500 : 400,
                        color: active ? "var(--ink)" : "var(--ink-2)" }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{t.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card padded={false}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", borderBottom: "1px solid var(--line)",
            }}>
              <div className="label-xs">Documents · {pdfs.length}</div>
              <button style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}
                onClick={() => setSelected(s => s.length === pdfs.length ? [] : pdfs.map(p => p.id))}>
                {selected.length === pdfs.length && pdfs.length > 0 ? "Clear" : "All"}
              </button>
            </div>
            {pdfs.length === 0 ? (
              <div style={{ padding: "20px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 8 }}>No documents indexed yet.</div>
                <Btn variant="default" icon={Ic.Upload} onClick={() => setTab("upload")}>Upload</Btn>
              </div>
            ) : (
              <div style={{ padding: 6 }}>
                {pdfs.map(p => {
                  const sel = selected.includes(p.id);
                  return (
                    <label key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "7px 8px",
                      borderRadius: 6, cursor: "pointer",
                      background: sel ? "var(--accent-soft)" : "transparent",
                    }}
                      onMouseEnter={e => !sel && (e.currentTarget.style.background = "var(--surface-2)")}
                      onMouseLeave={e => !sel && (e.currentTarget.style.background = "transparent")}>
                      <input type="checkbox" checked={sel}
                        onChange={() => setSelected(s => sel ? s.filter(x => x !== p.id) : [...s, p.id])}
                        style={{ accentColor: "var(--accent)" }} />
                      <span style={{ width: 13, height: 13, color: sel ? "var(--accent)" : "var(--ink-3)" }}><Ic.Pdf /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: sel ? 500 : 400, color: "var(--ink)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }} className="mono">{p.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>
                          <span className="mono">{p.chunks} chunks · {p.t}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          {tab === "upload"  && <UploadPanel  pdfs={pdfs} setPdfs={setPdfs} setSelected={setSelected} />}
          {tab === "ask"     && <AskPanel     pdfs={pdfs} selected={selected} />}
          {tab === "summary" && <SummaryPanel pdfs={pdfs} selected={selected} />}
          {tab === "quiz"    && <QuizPanel    pdfs={pdfs} selected={selected} />}
        </div>
      </div>
    </div>
  );
}

function UploadPanel({ pdfs, setPdfs, setSelected }) {
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  const handleFile = (file) => {
    setName(file.name);
    setStage("uploading"); setProgress(0);
    emitAIActivity({ type: "upload", label: `Uploading ${file.name}`, status: "processing" });
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(id);
          setStage("ingesting");
          emitAIActivity({ type: "embed", label: `Embedding & indexing ${file.name}`, status: "processing" });
          setTimeout(finish, 1200);
          return 100;
        }
        return p + 7;
      });
    }, 60);
  };
  const finish = () => {
    const chunks = Math.floor(40 + Math.random() * 80);
    const newPdf = { id: "p" + Date.now(), name, chunks, t: "just now" };
    setPdfs(ps => [newPdf, ...ps]);
    setSelected(s => [newPdf.id, ...s]);
    setStage("done");
    emitAIActivity({ type: "embed", label: `Indexed ${name} — ${chunks} chunks`, status: "done" });
    setTimeout(() => { setStage("idle"); setName(""); setProgress(0); }, 1600);
  };

  return (
    <Card padded={false}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
        <div className="label-xs">Upload & index</div>
        <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Add documents to your library</div>
      </div>
      <div style={{ padding: 24 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          style={{
            padding: 36, border: `2px dashed ${dragging ? "var(--accent)" : "var(--line-strong)"}`,
            borderRadius: 14, textAlign: "center", cursor: "pointer",
            background: dragging ? "var(--accent-soft)" : "var(--surface-2)",
            transition: "all 160ms",
          }}>
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <div style={{
            width: 52, height: 52, borderRadius: "50%", margin: "0 auto 10px",
            background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent-line)",
            display: "grid", placeItems: "center",
          }}><span style={{ width: 22, height: 22 }}><Ic.Upload /></span></div>
          <div style={{ fontSize: "var(--fs-15)", fontWeight: 500, marginBottom: 4 }}>
            Drop a PDF here, or click to browse
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            We split into 220-word chunks, embed with all-MiniLM-L6-v2, and store in ChromaDB.
          </div>
        </div>

        {stage !== "idle" && (
          <div style={{ marginTop: 18, padding: 14, border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, color: "var(--accent)" }}><Ic.Pdf /></span>
                <span className="mono" style={{ fontSize: 12 }}>{name}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {stage === "uploading" ? `uploading · ${progress}%` : stage === "ingesting" ? "embedding · 84 chunks" : "✓ indexed"}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: stage === "done" ? "100%" : stage === "ingesting" ? "100%" : `${progress}%`,
                background: stage === "done" ? "var(--ok)" : "var(--accent)",
                transition: "width 120ms",
              }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--surface-2)",
        fontSize: 11, color: "var(--ink-3)" }} className="mono">
        endpoint: POST /upload → POST /ingest · stored in chroma_db/learnlens_chunks
      </div>
    </Card>
  );
}

function AskPanel({ pdfs, selected }) {
  const [q, setQ] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const noPdfs = pdfs.length === 0;
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollTo({ top: endRef.current.scrollHeight, behavior: "smooth" }); }, [history, loading]);

  const send = () => {
    if (!q.trim() || noPdfs) return;
    const userMsg = { role: "user", text: q };
    const queryText = q;
    setHistory(h => [...h, userMsg]); setQ(""); setLoading(true);
    emitAIActivity({ type: "ask", label: `Searching: "${queryText.slice(0, 40)}${queryText.length > 40 ? "…" : ""}"`, status: "processing" });
    setTimeout(() => {
      setHistory(h => [...h, {
        role: "assistant",
        text: "Based on the indexed notes, a sequence (a_n) in ℝ is Cauchy precisely when its tail diameter shrinks to zero. Formally, for every ε > 0 there exists N such that |a_m − a_n| < ε whenever m, n ≥ N. The completeness of ℝ guarantees every such sequence converges to a real limit (see Theorem 4.3 in Spivak Ch. 7).",
        cites: [
          { p: "Spivak_Calculus_Ch7.pdf", page: 124, snippet: "A sequence is Cauchy if its terms eventually crowd together…" },
          { p: "Spivak_Calculus_Ch7.pdf", page: 131, snippet: "Theorem 4.3 — Every Cauchy sequence in ℝ converges in ℝ." },
        ],
      }]);
      emitAIActivity({ type: "ask", label: `Retrieved 6 chunks — answer generated`, status: "done" });
      setLoading(false);
    }, 1100);
  };

  return (
    <Card padded={false} style={{ display: "flex", flexDirection: "column", minHeight: 520 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div className="label-xs">Ask AI</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Grounded over {selected.length || 0} doc{selected.length === 1 ? "" : "s"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--ink-3)" }} className="mono">
          POST /ask
        </div>
      </div>

      <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        {history.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 13, marginBottom: 12 }}>Ask something. The model only answers from your selected notes.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {[
                "Why does the uncle-red case in RB-tree fixup recurse upward?",
                "Define a Cauchy sequence in your own words.",
                "Summarise membrane transport in 3 sentences.",
              ].map(s => (
                <button key={s} onClick={() => setQ(s)} style={{
                  fontSize: 11.5, padding: "5px 10px", borderRadius: 100,
                  border: "1px solid var(--line)", color: "var(--ink-2)",
                  background: "var(--surface)",
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            {m.role === "user" ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  background: "var(--accent)", color: "var(--on-accent)",
                  padding: "8px 14px", borderRadius: "14px 14px 4px 14px",
                  maxWidth: "75%", fontSize: "var(--fs-14)",
                }}>{m.text}</div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: "var(--accent-soft)", color: "var(--accent)",
                    display: "grid", placeItems: "center",
                  }}><span style={{ width: 12, height: 12 }}><Ic.Bot /></span></span>
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>LearnLens · 6 chunks retrieved</span>
                </div>
                <div className="serif" style={{
                  fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.65,
                  color: "var(--ink)", textWrap: "pretty", marginBottom: 10, marginLeft: 30,
                }}>{m.text}</div>
                <div style={{ marginLeft: 30, display: "flex", flexDirection: "column", gap: 6 }}>
                  {m.cites.map((c, j) => (
                    <div key={j} style={{
                      padding: "8px 12px", background: "var(--surface-2)",
                      border: "1px solid var(--line-soft)", borderRadius: 6,
                      borderLeft: "2px solid var(--accent)",
                    }}>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--accent)", fontWeight: 500, marginBottom: 2 }}>
                        {c.p} · p. {c.page}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", fontStyle: "italic" }}>"{c.snippet}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-3)", fontSize: 12 }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              background: "var(--accent-soft)", color: "var(--accent)",
              display: "grid", placeItems: "center",
            }}><span style={{ width: 12, height: 12 }}><Ic.Bot /></span></span>
            <span>Retrieving from <span className="mono">{selected.length}</span> document{selected.length === 1 ? "" : "s"}…</span>
            <span style={{ display: "inline-flex", gap: 3 }}>
              {[0, 1, 2].map(i => <span key={i} style={{
                width: 4, height: 4, borderRadius: "50%", background: "var(--accent)",
                animation: `ll-pulse-soft 1s ${i * 0.2}s infinite`,
              }} />)}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 14, borderTop: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px 8px 12px", border: "1px solid var(--line)", borderRadius: 10,
          background: "var(--surface)",
        }}>
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
            placeholder={noPdfs ? "Upload a document first…" : "Ask about your notes…"}
            disabled={noPdfs}
            style={{
              flex: 1, background: "none", border: 0, outline: "none",
              fontSize: "var(--fs-14)", color: "var(--ink)",
            }} />
          <button onClick={send} disabled={noPdfs || !q.trim() || loading} style={{
            display: "grid", placeItems: "center", width: 32, height: 32,
            borderRadius: 6, background: (noPdfs || !q.trim()) ? "var(--surface-2)" : "var(--accent)",
            color: (noPdfs || !q.trim()) ? "var(--ink-3)" : "var(--on-accent)",
            cursor: (noPdfs || !q.trim()) ? "not-allowed" : "pointer",
          }}><span style={{ width: 14, height: 14 }}><Ic.Send /></span></button>
        </div>
      </div>
    </Card>
  );
}

function SummaryPanel({ pdfs, selected }) {
  const [length, setLength] = useState("medium");
  const [generated, setGen] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    if (selected.length === 0) return;
    setLoading(true); setGen(null);
    emitAIActivity({ type: "summary", label: `Summarising ${selected.length} document${selected.length === 1 ? "" : "s"}`, status: "processing" });
    setTimeout(() => {
      setGen({
        words: length === "short" ? 80 : length === "medium" ? 220 : 420,
        bullets: [
          "Cauchy sequences are characterised by their tail diameter shrinking to zero — for every ε > 0, all sufficiently distant terms lie within ε of each other.",
          "In ℝ, completeness guarantees that every Cauchy sequence converges to a real limit (Theorem 4.3).",
          "ℚ is not complete: the sequence (1, 1.4, 1.41, 1.414, …) converging to √2 is Cauchy in ℚ but has no rational limit.",
          "Bolzano–Weierstrass: every bounded sequence in ℝⁿ has a convergent subsequence — a structural cousin of Cauchy completeness.",
          "Contractive sequences (|aₙ₊₁ − aₙ| ≤ k|aₙ − aₙ₋₁| with k < 1) are always Cauchy, giving a sufficient condition for convergence.",
        ],
        sourcesUsed: selected.length,
      });
      emitAIActivity({ type: "summary", label: `Summary ready — ${length} format`, status: "done" });
      setLoading(false);
    }, 1400);
  };

  return (
    <Card padded={false}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div className="label-xs">Summarise</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Synthesise across {selected.length} doc{selected.length === 1 ? "" : "s"}</div>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>POST /summary</div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <span className="label-xs">Length</span>
          <div style={{ display: "flex", gap: 1, padding: 2, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            {[["short", "TL;DR"], ["medium", "Standard"], ["long", "Deep"]].map(([v, l]) => (
              <button key={v} onClick={() => setLength(v)} style={{
                padding: "5px 12px", borderRadius: 4,
                background: length === v ? "var(--surface)" : "transparent",
                color: length === v ? "var(--ink)" : "var(--ink-3)",
                fontSize: 12, fontWeight: length === v ? 500 : 400,
                boxShadow: length === v ? "var(--shadow-sm)" : "none",
              }}>{l}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <Btn variant="primary" icon={Ic.Sparkle} onClick={run}>{loading ? "Working…" : "Generate"}</Btn>
        </div>

        {!generated && !loading && (
          <div style={{
            padding: "32px 20px", textAlign: "center", color: "var(--ink-3)",
            border: "1px dashed var(--line-strong)", borderRadius: 10,
          }}>
            {selected.length === 0
              ? "Select one or more documents to summarise."
              : "Click Generate. The model will pull the most informative chunks and synthesise."}
          </div>
        )}

        {loading && (
          <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 10 }}>
            {[80, 95, 70, 88, 60].map((w, i) => (
              <div key={i} style={{
                height: 10, marginBottom: 8, borderRadius: 3,
                background: "linear-gradient(90deg, var(--surface-2) 25%, var(--line-soft) 50%, var(--surface-2) 75%)",
                backgroundSize: "200% 100%",
                animation: "ll-shimmer 1.4s linear infinite",
                width: `${w}%`,
              }} />
            ))}
          </div>
        )}

        {generated && (
          <div style={{ padding: "18px 22px", border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="label-xs">Summary · {generated.words} words · {generated.sourcesUsed} source{generated.sourcesUsed === 1 ? "" : "s"}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="ghost" icon={Ic.Note}>Save to notes</Btn>
                <Btn variant="ghost">Copy</Btn>
              </div>
            </div>
            <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }} className="serif">
              {generated.bullets.map((b, i) => (
                <li key={i} style={{
                  fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.6,
                  color: "var(--ink)", paddingLeft: 18, position: "relative", textWrap: "pretty",
                }}>
                  <span style={{ position: "absolute", left: 0, top: 9, width: 6, height: 6, borderRadius: 1, background: "var(--accent)" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function QuizPanel({ pdfs, selected }) {
  const analytics = useAnalytics();
  const [diff, setDiff] = useState("Medium");
  const [mode, setMode] = useState("Notes Only");
  const [pyq, setPyq] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [picked, setPicked] = useState({});
  const [loading, setLoading] = useState(false);
  const scoreRecorded = useRef(false);

  // Detect quiz completion and record recall score
  useEffect(() => {
    if (!quiz || scoreRecorded.current) return;
    const allAnswered = quiz.every((_, i) => picked[i] !== undefined);
    if (!allAnswered) return;
    scoreRecorded.current = true;
    const correct = quiz.filter((q, i) => picked[i] === q.c).length;
    analytics?.recordQuizResult({ score: correct, total: quiz.length });
    emitAIActivity({
      type: "quiz",
      label: `Quiz done — ${correct}/${quiz.length} correct (${Math.round((correct / quiz.length) * 100)}%)`,
      status: "done",
    });
  }, [JSON.stringify(Object.values(picked)), quiz]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset recorded flag when a new quiz is generated
  useEffect(() => { scoreRecorded.current = false; }, [quiz]);

  const generate = () => {
    if (selected.length === 0) return;
    setLoading(true); setQuiz(null); setPicked({});
    emitAIActivity({ type: "quiz", label: `Generating ${diff.toLowerCase()} quiz from ${selected.length} doc${selected.length === 1 ? "" : "s"}`, status: "processing" });
    setTimeout(() => {
      setQuiz([
        { q: "A sequence (aₙ) in ℝ is Cauchy if and only if:", o: { A: "It is monotonic and bounded.", B: "For every ε > 0 there exists N such that |aₘ − aₙ| < ε whenever m, n ≥ N.", C: "It has a subsequence converging to its supremum.", D: "It is bounded above." }, c: "B", e: "Direct from the Cauchy criterion — tails crowd within every ε." },
        { q: "Which space is NOT complete?", o: { A: "ℝ", B: "ℝⁿ", C: "ℚ", D: "ℓ²" }, c: "C", e: "ℚ is not complete: the sequence 1, 1.4, 1.41, … converges to √2 ∉ ℚ." },
        { q: "A contractive sequence satisfies |aₙ₊₁ − aₙ| ≤ k|aₙ − aₙ₋₁| with…", o: { A: "k < 1", B: "k = 1", C: "k > 1", D: "k ≤ 0" }, c: "A", e: "Strict contraction (k < 1) forces geometric decay of differences." },
      ]);
      emitAIActivity({ type: "quiz", label: "Quiz generated — 3 questions ready", status: "done" });
      setLoading(false);
    }, 1600);
  };

  return (
    <Card padded={false}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div className="label-xs">Quiz · 10 MCQ</div>
          <div style={{ fontSize: "var(--fs-18)", fontWeight: 500 }}>Validated retry loop · 3 attempts</div>
        </div>
        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>POST /quiz</div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <Control label="Difficulty">
            <div style={{ display: "flex", gap: 1, padding: 2, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
              {["Easy", "Medium", "Hard"].map(v => (
                <button key={v} onClick={() => setDiff(v)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 4,
                  background: diff === v ? "var(--surface)" : "transparent",
                  color: diff === v ? "var(--ink)" : "var(--ink-3)",
                  fontSize: 12, fontWeight: diff === v ? 500 : 400,
                  boxShadow: diff === v ? "var(--shadow-sm)" : "none",
                }}>{v}</button>
              ))}
            </div>
          </Control>
          <Control label="Mode">
            <select value={mode} onChange={e => setMode(e.target.value)} style={{
              padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 6,
              background: "var(--surface)", color: "var(--ink)", fontSize: "var(--fs-13)", width: "100%",
            }}>
              <option>Notes Only</option>
              <option>Notes + PYQ</option>
            </select>
          </Control>
          <Control label="Action">
            <Btn variant="primary" icon={Ic.Sparkle} onClick={generate} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Generating…" : "Generate quiz"}
            </Btn>
          </Control>
        </div>

        {mode === "Notes + PYQ" && (
          <div style={{ marginBottom: 16 }}>
            <Control label="Previous year questions (style reference)">
              <textarea value={pyq} onChange={e => setPyq(e.target.value)}
                placeholder="Paste previous year questions here — the model will infer style and depth…"
                style={{
                  width: "100%", minHeight: 80, padding: 10,
                  border: "1px solid var(--line)", borderRadius: 6,
                  background: "var(--surface)", color: "var(--ink)",
                  fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.5,
                  resize: "vertical",
                }} />
            </Control>
          </div>
        )}

        {!quiz && !loading && (
          <div style={{
            padding: "32px 20px", textAlign: "center", color: "var(--ink-3)",
            border: "1px dashed var(--line-strong)", borderRadius: 10,
          }}>
            {selected.length === 0
              ? "Select one or more documents to quiz on."
              : "Ready when you are. The model retries up to 3× until JSON validates."}
          </div>
        )}

        {loading && (
          <div style={{ padding: 16, border: "1px solid var(--line)", borderRadius: 10, fontSize: 12, color: "var(--ink-3)" }}>
            <div className="mono">attempt 1/3 · validating JSON shape…</div>
          </div>
        )}

        {quiz && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quiz.map((qq, i) => {
              const pickedAns = picked[i];
              return (
                <Card key={i} style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--accent)" }}>Q{i + 1} · {diff}</div>
                  </div>
                  <div style={{ fontSize: "var(--fs-15)", marginBottom: 12, lineHeight: 1.5 }} className="serif">{qq.q}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.entries(qq.o).map(([k, v]) => {
                      const isPicked = pickedAns === k;
                      const correct = pickedAns && k === qq.c;
                      const wrong = pickedAns === k && k !== qq.c;
                      return (
                        <button key={k} onClick={() => setPicked(p => ({ ...p, [i]: k }))} style={{
                          textAlign: "left", padding: "8px 12px", borderRadius: 6,
                          border: `1px solid ${correct ? "var(--ok)" : wrong ? "var(--due)" : isPicked ? "var(--accent)" : "var(--line)"}`,
                          background: correct ? "var(--ok-soft)" : wrong ? "var(--due-soft)" : isPicked ? "var(--accent-soft)" : "var(--surface)",
                          fontSize: 12.5, lineHeight: 1.4,
                          display: "flex", gap: 8, alignItems: "flex-start",
                        }}>
                          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{k}</span>
                          <span style={{ color: "var(--ink)" }}>{v}</span>
                        </button>
                      );
                    })}
                  </div>
                  {pickedAns && (
                    <div style={{
                      marginTop: 10, padding: "8px 12px", borderRadius: 6,
                      background: pickedAns === qq.c ? "var(--ok-soft)" : "var(--due-soft)",
                      borderLeft: `2px solid ${pickedAns === qq.c ? "var(--ok)" : "var(--due)"}`,
                      fontSize: 12, color: "var(--ink-2)",
                    }}>
                      <span style={{ fontWeight: 600, color: pickedAns === qq.c ? "var(--ok)" : "var(--due)" }}>
                        {pickedAns === qq.c ? "✓ Correct" : "✗ Incorrect"}
                      </span>{" — "}{qq.e}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function Control({ label, children }) {
  return (
    <div>
      <div className="label-xs" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

export { AITools };
