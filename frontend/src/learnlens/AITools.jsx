const API = "";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card, Pill, Btn, Ic } from "./Shell.jsx";
import { emitAIActivity, useAnalytics } from "./useStudyAnalytics.jsx";

function AITools() {
  const [tab, setTab] = useState("ask");
  const [pdfs, setPdfs] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/pdfs`)
      .then(r => r.json())
      .then(data => {
        if (data.pdfs && data.pdfs.length > 0) {
          const loaded = data.pdfs.map(p => ({
            id: p.id,
            name: p.name,
            chunks: p.chunks || 0,
            t: "indexed",
          }));
          setPdfs(loaded);
          setSelected(loaded.map(p => p.id));
        }
      })
      .catch(() => {});
  }, []);

  const deletePdf = async (pdfId) => {
    try {
      await fetch(`${API}/api/pdf/${pdfId}`, { method: "DELETE" });
      setPdfs(ps => ps.filter(p => p.id !== pdfId));
      setSelected(s => s.filter(x => x !== pdfId));
    } catch (err) {
      console.error(err);
    }
  };

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
                        style={{ accentColor: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ width: 13, height: 13, color: sel ? "var(--accent)" : "var(--ink-3)", flexShrink: 0 }}><Ic.Pdf /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: sel ? 500 : 400, color: "var(--ink)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }} className="mono">{p.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>
                          <span className="mono">{p.chunks} chunks · {p.t}</span>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); deletePdf(p.id); }}
                        title="Remove document"
                        style={{
                          flexShrink: 0, width: 18, height: 18, borderRadius: 4,
                          display: "grid", placeItems: "center",
                          color: "var(--ink-4)", background: "transparent",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--due-soft)"; e.currentTarget.style.color = "var(--due)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-4)"; }}>
                        <span style={{ width: 11, height: 11 }}><Ic.X /></span>
                      </button>
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
  const [fileName, setFileName] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    setFileName(file.name);
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.statusText}`);
      const uploadData = await uploadRes.json();

      setStage("ingesting");
      emitAIActivity({ type: "upload", label: `Uploading ${file.name}`, status: "processing" });

      const ingestRes = await fetch(`${API}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_id: uploadData.pdf_id }),
      });
      if (!ingestRes.ok) throw new Error(`Ingestion failed: ${ingestRes.statusText}`);
      const ingestData = await ingestRes.json();

      const chunks = ingestData.chunks_added || 0;
      setChunkCount(chunks);

      const newPdf = { id: uploadData.pdf_id, name: file.name, chunks, t: "just now" };
      setPdfs(ps => [newPdf, ...ps]);
      setSelected(s => [uploadData.pdf_id, ...s]);

      setStage("done");
      emitAIActivity({ type: "embed", label: `Indexed ${file.name} — ${chunks} chunks`, status: "done" });
      setTimeout(() => { setStage("idle"); setFileName(""); setChunkCount(0); }, 2000);
    } catch (err) {
      console.error(err);
      alert(err.message);
      setStage("idle");
      setFileName("");
    }
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
          onClick={() => stage === "idle" && inputRef.current?.click()}
          style={{
            padding: 36, border: `2px dashed ${dragging ? "var(--accent)" : "var(--line-strong)"}`,
            borderRadius: 14, textAlign: "center",
            cursor: stage === "idle" ? "pointer" : "default",
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
            Split into 220-word chunks, embedded with all-MiniLM-L6-v2, stored in Qdrant.
          </div>
        </div>

        {stage !== "idle" && (
          <div style={{ marginTop: 18, padding: 14, border: "1px solid var(--line)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, color: "var(--accent)" }}><Ic.Pdf /></span>
                <span className="mono" style={{ fontSize: 12 }}>{fileName}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {stage === "uploading" && "uploading…"}
                {stage === "ingesting" && "embedding…"}
                {stage === "done"      && `✓ ${chunkCount} chunks indexed`}
              </span>
            </div>
            <div style={{ height: 4, background: "var(--line-soft)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: stage === "done" ? "100%" : "60%",
                background: stage === "done" ? "var(--ok)" : "var(--accent)",
                transition: "width 400ms ease",
                animation: stage !== "done" ? "ll-shimmer 1.4s linear infinite" : "none",
                backgroundSize: "200% 100%",
              }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line)", background: "var(--surface-2)",
        fontSize: 11, color: "var(--ink-3)" }} className="mono">
        POST /api/upload → POST /api/ingest · stored in qdrant_data/
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

  const send = async () => {
    if (!q.trim() || loading) return;
    const question = q.trim();
    setHistory(h => [...h, { role: "user", text: question }]);
    setQ("");
    setLoading(true);
    emitAIActivity({ type: "ask", label: question.slice(0, 60), status: "processing" });

    try {
      const res = await fetch(`${API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, pdf_ids: selected }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
      const data = await res.json();
      setHistory(h => [...h, {
        role: "assistant",
        text: data.answer,
        sources: data.sources_used || [],
      }]);
      emitAIActivity({ type: "ask", label: question.slice(0, 60), status: "done" });
    } catch (err) {
      console.error(err);
      setHistory(h => [...h, { role: "assistant", text: "Something went wrong. Check the backend is running.", sources: [] }]);
    }
    setLoading(false);
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
          POST /api/ask
        </div>
      </div>

      <div ref={endRef} style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
        {history.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-3)" }}>
            <div style={{ fontSize: 13, marginBottom: 12 }}>Ask something. The model only answers from your selected notes.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {[
                "Summarise the key concepts in this document.",
                "What are the most important definitions?",
                "Explain the main topic in simple terms.",
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
                  <span style={{ fontSize: 11, color: "var(--ink-3)" }}>LearnLens · {selected.length} doc{selected.length === 1 ? "" : "s"} searched</span>
                </div>
                <div className="serif" style={{
                  fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.65,
                  color: "var(--ink)", textWrap: "pretty", marginBottom: 10, marginLeft: 30,
                  whiteSpace: "pre-wrap",
                }}>{m.text}</div>
                {m.sources && m.sources.length > 0 && (
                  <div style={{ marginLeft: 30, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {m.sources.map((src, j) => (
                      <span key={j} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 8px", borderRadius: 100,
                        background: "var(--accent-soft)", color: "var(--accent)",
                        border: "1px solid var(--accent-line)",
                        fontSize: 11, fontWeight: 500,
                      }}>
                        <span style={{ width: 10, height: 10 }}><Ic.Pdf /></span>
                        {src}
                      </span>
                    ))}
                  </div>
                )}
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
  const [generated, setGen] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setGen(null);
    emitAIActivity({ type: "summary", label: `Summarising ${selected.length} doc${selected.length === 1 ? "" : "s"}`, status: "processing" });

    try {
      const res = await fetch(`${API}/api/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_ids: selected }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
      const data = await res.json();
      setGen({ text: data.summary, sources: data.sources_used || [] });
      emitAIActivity({ type: "summary", label: `Summary ready`, status: "done" });
    } catch (err) {
      console.error(err);
      alert("Summary generation failed. Check the backend is running.");
    }
    setLoading(false);
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
        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>POST /api/summary</div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ flex: 1 }} />
          <Btn variant="primary" icon={Ic.Sparkle} onClick={run} disabled={selected.length === 0}>
            {loading ? "Working…" : "Generate"}
          </Btn>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {generated.sources.map((src, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 100,
                    background: "var(--accent-soft)", color: "var(--accent)",
                    border: "1px solid var(--accent-line)",
                    fontSize: 11, fontWeight: 500,
                  }}>
                    <span style={{ width: 10, height: 10 }}><Ic.Pdf /></span>
                    {src}
                  </span>
                ))}
              </div>
              <Btn variant="ghost">Copy</Btn>
            </div>
            <div className="serif" style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink)" }}>
              <ReactMarkdown components={{
                p:      ({ children }) => <p style={{ lineHeight: 1.7, marginBottom: 10, textWrap: "pretty" }}>{children}</p>,
                strong: ({ children }) => <strong style={{ fontWeight: 600, color: "var(--ink)" }}>{children}</strong>,
                em:     ({ children }) => <em style={{ fontStyle: "italic" }}>{children}</em>,
                h1:     ({ children }) => <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 600, margin: "16px 0 6px", color: "var(--ink)" }}>{children}</h2>,
                h2:     ({ children }) => <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, margin: "14px 0 5px", color: "var(--ink)" }}>{children}</h3>,
                h3:     ({ children }) => <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 600, margin: "12px 0 4px", color: "var(--ink)" }}>{children}</h4>,
                ul:     ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 10, lineHeight: 1.7 }}>{children}</ul>,
                ol:     ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 10, lineHeight: 1.7 }}>{children}</ol>,
                li:     ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                code:   ({ children }) => <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, padding: "1px 5px", borderRadius: 3, background: "var(--surface-2)" }}>{children}</code>,
                pre:    ({ children }) => <pre style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, padding: "10px 14px", borderRadius: 6, background: "var(--surface-2)", overflowX: "auto", marginBottom: 10 }}>{children}</pre>,
              }}>
                {generated.text}
              </ReactMarkdown>
            </div>
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

  useEffect(() => {
    if (!quiz || scoreRecorded.current) return;
    const allAnswered = quiz.every((_, i) => picked[i] !== undefined);
    if (!allAnswered) return;
    scoreRecorded.current = true;
    const correct = quiz.filter((q, i) => picked[i] === q.answer).length;
    analytics?.recordQuizResult({ score: correct, total: quiz.length });
    emitAIActivity({
      type: "quiz",
      label: `Quiz done — ${correct}/${quiz.length} correct (${Math.round((correct / quiz.length) * 100)}%)`,
      status: "done",
    });
  }, [JSON.stringify(Object.values(picked)), quiz]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { scoreRecorded.current = false; }, [quiz]);

  const generate = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setQuiz(null);
    setPicked({});
    emitAIActivity({ type: "quiz", label: `Generating ${diff} quiz`, status: "processing" });

    try {
      const res = await fetch(`${API}/api/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf_ids: selected, difficulty: diff, mode, pyq_text: pyq }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
      const data = await res.json();

      if (!data.quiz || data.quiz.length === 0) {
        alert(data.error || "Quiz generation failed. Try again.");
        setLoading(false);
        return;
      }

      const parsed = data.quiz.map(q => {
        const opts = {};
        (q.options || []).forEach(o => {
          const dot = o.indexOf(". ");
          if (dot !== -1) opts[o.slice(0, dot)] = o.slice(dot + 2);
        });
        return { question: q.question, opts, answer: q.answer, explanation: q.explanation };
      });

      setQuiz(parsed);
    } catch (err) {
      console.error(err);
      alert("Quiz generation failed. Check the backend is running.");
    }
    setLoading(false);
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
        <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>POST /api/quiz</div>
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
            <Btn variant="primary" icon={Ic.Sparkle} onClick={generate}
              style={{ width: "100%", justifyContent: "center" }}
              disabled={selected.length === 0}>
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
            <div className="mono">generating quiz · validating JSON shape…</div>
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
                  <div style={{ fontSize: "var(--fs-15)", marginBottom: 12, lineHeight: 1.5 }} className="serif">{qq.question}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {Object.entries(qq.opts).map(([k, v]) => {
                      const isPicked = pickedAns === k;
                      const correct = pickedAns && k === qq.answer;
                      const wrong = pickedAns === k && k !== qq.answer;
                      return (
                        <button key={k} onClick={() => !pickedAns && setPicked(p => ({ ...p, [i]: k }))} style={{
                          textAlign: "left", padding: "8px 12px", borderRadius: 6,
                          border: `1px solid ${correct ? "var(--ok)" : wrong ? "var(--due)" : isPicked ? "var(--accent)" : "var(--line)"}`,
                          background: correct ? "var(--ok-soft)" : wrong ? "var(--due-soft)" : isPicked ? "var(--accent-soft)" : "var(--surface)",
                          fontSize: 12.5, lineHeight: 1.4,
                          display: "flex", gap: 8, alignItems: "flex-start",
                          cursor: pickedAns ? "default" : "pointer",
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
                      background: pickedAns === qq.answer ? "var(--ok-soft)" : "var(--due-soft)",
                      borderLeft: `2px solid ${pickedAns === qq.answer ? "var(--ok)" : "var(--due)"}`,
                      fontSize: 12, color: "var(--ink-2)",
                    }}>
                      <span style={{ fontWeight: 600, color: pickedAns === qq.answer ? "var(--ok)" : "var(--due)" }}>
                        {pickedAns === qq.answer ? "✓ Correct" : "✗ Incorrect"}
                      </span>{" — "}{qq.explanation}
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
