import { useState, useRef, useEffect } from "react";

const API_BASE = "/api";

// ─── Theme & Styles ───────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    /* Scoped to .ll-legacy so the academic-OS shell's design tokens stay untouched. */
    .ll-legacy, .ll-legacy *, .ll-legacy *::before, .ll-legacy *::after { box-sizing: border-box; }

    .ll-legacy {
      --bg: #0a0a0f;
      --bg-card: #111118;
      --bg-elevated: #18181f;
      --bg-hover: #1e1e28;
      --border: rgba(255,255,255,0.07);
      --border-accent: rgba(120,100,255,0.3);
      --text: #f0eeff;
      --text-muted: rgba(240,238,255,0.45);
      --text-dim: rgba(240,238,255,0.25);
      --accent: #7c6bff;
      --accent-bright: #9d8fff;
      --accent-glow: rgba(124,107,255,0.15);
      --accent-2: #ff6b9d;
      --accent-3: #4dd9ac;
      --success: #4dd9ac;
      --error: #ff6b6b;
      --warn: #ffd166;
      --font-display: 'Playfair Display', Georgia, serif;
      --font-body: 'DM Sans', sans-serif;
      --font-mono: 'DM Mono', monospace;
      --radius: 12px;
      --radius-lg: 18px;
      --radius-xl: 24px;
      --shadow: 0 4px 24px rgba(0,0,0,0.4);
      --shadow-accent: 0 0 40px rgba(124,107,255,0.12);
    }

    .ll-legacy {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      font-size: 15px;
      line-height: 1.65;
      -webkit-font-smoothing: antialiased;
      min-height: 100%;
    }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(124,107,255,0.25); border-radius: 3px; }

    button { cursor: pointer; font-family: var(--font-body); }
    input, select, textarea { font-family: var(--font-body); }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(124,107,255,0.4); }
      100% { box-shadow: 0 0 0 12px rgba(124,107,255,0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }

    .fade-up { animation: fadeUp 0.5s ease both; }
    .fade-up-2 { animation: fadeUp 0.5s 0.1s ease both; }
    .fade-up-3 { animation: fadeUp 0.5s 0.2s ease both; }
  `}</style>
);

// ─── Utility Components ───────────────────────────────────────────────────────

const Spinner = ({ size = 20, color = "var(--accent)" }) => (
  <span style={{
    display: "inline-block", width: size, height: size, borderRadius: "50%",
    border: `2px solid rgba(124,107,255,0.15)`,
    borderTopColor: color,
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  }} />
);

const Tag = ({ children, color = "accent" }) => {
  const colors = {
    accent: { bg: "rgba(124,107,255,0.12)", text: "var(--accent-bright)", border: "rgba(124,107,255,0.2)" },
    green: { bg: "rgba(77,217,172,0.1)", text: "var(--accent-3)", border: "rgba(77,217,172,0.2)" },
    pink: { bg: "rgba(255,107,157,0.1)", text: "var(--accent-2)", border: "rgba(255,107,157,0.2)" },
    warn: { bg: "rgba(255,209,102,0.1)", text: "var(--warn)", border: "rgba(255,209,102,0.2)" },
  };
  const c = colors[color] || colors.accent;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: "100px", fontSize: 12, fontWeight: 500, letterSpacing: "0.02em",
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>{children}</span>
  );
};

// ✅ FIXED: Removed invalid ":hover" pseudo-class from inline styles
const Card = ({ children, style, onClick, hover = true }) => (
  <div 
    onClick={onClick} 
    style={{
      background: "var(--bg-card)", 
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", 
      padding: "1.5rem",
      transition: "all 0.2s ease", 
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={e => hover && onClick && (
      e.currentTarget.style.borderColor = "var(--border-accent)", 
      e.currentTarget.style.background = "var(--bg-elevated)"
    )}
    onMouseLeave={e => hover && onClick && (
      e.currentTarget.style.borderColor = "var(--border)", 
      e.currentTarget.style.background = "var(--bg-card)"
    )}
  >
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", loading, disabled, style }) => {
  const variants = {
    primary: {
      background: "var(--accent)", color: "#fff", border: "none",
      boxShadow: "0 2px 20px rgba(124,107,255,0.35)",
    },
    ghost: {
      background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)",
    },
    outline: {
      background: "transparent", color: "var(--accent-bright)", border: "1px solid var(--border-accent)",
    },
    danger: {
      background: "rgba(255,107,107,0.12)", color: "var(--error)", border: "1px solid rgba(255,107,107,0.2)",
    },
  };
  return (
    <button
      onClick={!disabled && !loading ? onClick : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "10px 20px", borderRadius: "var(--radius)", fontWeight: 500,
        fontSize: 14, transition: "all 0.2s ease", whiteSpace: "nowrap",
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          if (variant === "primary") e.currentTarget.style.filter = "brightness(1.1)";
          if (variant === "ghost" || variant === "outline") e.currentTarget.style.background = "var(--bg-hover)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter = "";
        if (variant === "ghost") e.currentTarget.style.background = "transparent";
        if (variant === "outline") e.currentTarget.style.background = "transparent";
      }}
    >
      {loading && <Spinner size={16} color={variant === "primary" ? "#fff" : "var(--accent)"} />}
      {children}
    </button>
  );
};

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadPDF(file) {
  const fd = new FormData();
  fd.append("file", file);
  return apiFetch("/upload", { method: "POST", body: fd });
}

async function ingestPDF(pdfId) {
  return apiFetch("/ingest", { method: "POST", body: JSON.stringify({ pdf_id: pdfId }), headers: { "Content-Type": "application/json" } });
}

async function askQuestion(question, userId) {
  return apiFetch("/ask", { method: "POST", body: JSON.stringify({ question, user_id: userId }), headers: { "Content-Type": "application/json" } });
}

// UPDATED: Accept array of pdf_ids
async function generateSummary(pdfIds, userId) {
  return apiFetch("/summary", { 
    method: "POST", 
    body: JSON.stringify({ pdf_ids: Array.isArray(pdfIds) ? pdfIds : [pdfIds], user_id: userId }), 
    headers: { "Content-Type": "application/json" } 
  });
}

// UPDATED: Accept array of pdf_ids
async function generateQuiz(pdfIds, userId, difficulty, mode, pyqText = "") {
  return apiFetch("/quiz", { 
    method: "POST", 
    body: JSON.stringify({ pdf_ids: Array.isArray(pdfIds) ? pdfIds : [pdfIds], user_id: userId, difficulty, mode, pyq_text: pyqText }), 
    headers: { "Content-Type": "application/json" } 
  });
}

async function listPDFs(userId) {
  return apiFetch(`/pdfs?user_id=${userId}`);
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "upload", icon: "⬆", label: "Upload" },
  { id: "chat", icon: "💬", label: "Ask AI" },
  { id: "summary", icon: "📋", label: "Summary" },
  { id: "quiz", icon: "🎯", label: "Quiz" },
];

const Sidebar = ({ active, setActive, pdfs, selectedPdf, setSelectedPdf }) => (
  <div style={{
    width: 240, flexShrink: 0, height: "100vh", position: "sticky", top: 0,
    background: "var(--bg-card)", borderRight: "1px solid var(--border)",
    display: "flex", flexDirection: "column", overflow: "hidden",
  }}>
    {/* Logo */}
    <div style={{ padding: "28px 24px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, animation: "float 3s ease-in-out infinite",
        }}>📘</div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
            Learn<span style={{ color: "var(--accent)" }}>Lens</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: -2 }}>Exam Intelligence</div>
        </div>
      </div>
    </div>

    {/* Nav */}
    <nav style={{ padding: "0 12px", flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-dim)", padding: "0 12px 8px", textTransform: "uppercase" }}>Workspace</div>
      {NAV.map(n => (
        <div key={n.id} onClick={() => setActive(n.id)} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: "var(--radius)",
          cursor: "pointer", marginBottom: 2, transition: "all 0.15s",
          background: active === n.id ? "var(--accent-glow)" : "transparent",
          color: active === n.id ? "var(--accent-bright)" : "var(--text-muted)",
          borderLeft: active === n.id ? `2px solid var(--accent)` : "2px solid transparent",
          fontWeight: active === n.id ? 500 : 400,
        }}
          onMouseEnter={e => active !== n.id && (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => active !== n.id && (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: 15 }}>{n.icon}</span>
          <span style={{ fontSize: 14 }}>{n.label}</span>
        </div>
      ))}

      {/* Documents list */}
      {pdfs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-dim)", padding: "0 12px 8px", textTransform: "uppercase" }}>Documents</div>
          {pdfs.map(p => (
            <div key={p.id} onClick={() => setSelectedPdf(p)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: "var(--radius)",
              cursor: "pointer", marginBottom: 2, transition: "all 0.15s",
              background: selectedPdf?.id === p.id ? "rgba(124,107,255,0.08)" : "transparent",
              color: selectedPdf?.id === p.id ? "var(--text)" : "var(--text-muted)",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = selectedPdf?.id === p.id ? "rgba(124,107,255,0.08)" : "transparent"}
            >
              <span style={{ fontSize: 13 }}>📄</span>
              <span style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </nav>

    {/* Footer */}
    <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#fff",
        }}>S</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Student</div>
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Free Plan</div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Upload Tab ───────────────────────────────────────────────────────────────

const UploadTab = ({ onIngested, pdfs }) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const inputRef = useRef();

  const handleFile = f => {
    if (f?.type === "application/pdf") setFile(f);
  };

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleIngest = async () => {
    if (!file) return;
    setLoading(true); setStatus(null);
    try {
      const { pdf_id, name } = await uploadPDF(file);
      await ingestPDF(pdf_id);
      setStatus({ ok: true, msg: `"${name}" ingested successfully!` });
      onIngested({ id: pdf_id, name });
      setFile(null);
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>
          Upload your <span style={{ color: "var(--accent)" }}>notes</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Drop in a PDF and LearnLens will index it for smart Q&A, summaries, and quizzes.</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        style={{
          border: `2px dashed ${dragging ? "var(--accent)" : file ? "var(--accent-3)" : "var(--border)"}`,
          borderRadius: "var(--radius-xl)", padding: "56px 32px",
          textAlign: "center", cursor: "pointer", transition: "all 0.2s",
          background: dragging ? "var(--accent-glow)" : file ? "rgba(77,217,172,0.04)" : "var(--bg-card)",
          position: "relative", overflow: "hidden",
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

        {file ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{file.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            <Tag color="green" style={{ marginTop: 12 }}>Ready to ingest</Tag>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⬆️</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Drop your PDF here</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>or click to browse files</div>
          </>
        )}
      </div>

      {file && (
        <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setFile(null)}>Clear</Btn>
          <Btn onClick={handleIngest} loading={loading}>
            {loading ? "Ingesting…" : "Ingest PDF →"}
          </Btn>
        </div>
      )}

      {status && (
        <div style={{
          marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius)",
          background: status.ok ? "rgba(77,217,172,0.08)" : "rgba(255,107,107,0.08)",
          border: `1px solid ${status.ok ? "rgba(77,217,172,0.2)" : "rgba(255,107,107,0.2)"}`,
          color: status.ok ? "var(--success)" : "var(--error)", fontSize: 14,
        }}>
          {status.ok ? "✓ " : "✗ "}{status.msg}
        </div>
      )}

      {/* Uploaded docs */}
      {pdfs.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Indexed Documents</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pdfs.map(p => (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: "var(--radius)",
                background: "var(--bg-card)", border: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                <Tag color="green">Indexed</Tag>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

const ChatTab = ({ userId }) => {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const { answer } = await askQuestion(q, userId);
      setMsgs(m => [...m, { role: "ai", text: answer }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "ai", text: `Error: ${e.message}`, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 48px)" }}>
      {/* Header */}
      <div style={{ padding: "0 0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>
          Ask your <span style={{ color: "var(--accent)" }}>notes</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>Ask anything — I'll answer from your indexed documents.</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4 }}>
        {msgs.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", gap: 12 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 15, textAlign: "center" }}>Start by asking a question from your notes</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {["What are the key concepts?", "Summarize chapter 1", "Explain this in simple terms"].map(s => (
                <div key={s} onClick={() => setInput(s)} style={{
                  padding: "8px 14px", borderRadius: 100, fontSize: 13,
                  border: "1px solid var(--border)", background: "var(--bg-card)",
                  cursor: "pointer", color: "var(--text-muted)", transition: "all 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-accent)", e.currentTarget.style.color = "var(--text)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)", e.currentTarget.style.color = "var(--text-muted)")}
                >{s}</div>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} style={{
            display: "flex", gap: 12, justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            animation: "fadeUp 0.3s ease both",
          }}>
            {m.role === "ai" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>📘</div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: m.role === "user" ? "var(--accent)" : "var(--bg-card)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
              color: m.error ? "var(--error)" : "var(--text)",
              fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>📘</div>
            <div style={{ padding: "14px 18px", borderRadius: "18px 18px 18px 4px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                    animation: `pulse-ring 1.2s ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ paddingTop: 16, display: "flex", gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask a question from your notes…"
          style={{
            flex: 1, padding: "13px 18px", borderRadius: 100, fontSize: 14,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text)", outline: "none", transition: "border-color 0.2s",
          }}
          onFocus={e => e.target.style.borderColor = "var(--border-accent)"}
          onBlur={e => e.target.style.borderColor = "var(--border)"}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{
          width: 46, height: 46, borderRadius: "50%", border: "none",
          background: !input.trim() || loading ? "var(--bg-elevated)" : "var(--accent)",
          color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: !input.trim() || loading ? "not-allowed" : "pointer", transition: "all 0.2s",
          flexShrink: 0,
        }}>→</button>
      </div>
    </div>
  );
};

// ─── Summary Tab ──────────────────────────────────────────────────────────────

const SummaryTab = ({ pdfs, userId }) => {
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const togglePdf = (pdf) => {
    setSelectedPdfs(prev => {
      const exists = prev.find(p => p.id === pdf.id);
      if (exists) {
        return prev.filter(p => p.id !== pdf.id);
      } else {
        return [...prev, pdf];
      }
    });
  };

  const handleSummary = async () => {
    if (selectedPdfs.length === 0) return;
    setLoading(true); setSummary(null);
    try {
      const pdfIds = selectedPdfs.map(p => p.id);
      const { summary: s } = await generateSummary(pdfIds, userId);
      setSummary(s);
    } catch (e) {
      setSummary(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Smart <span style={{ color: "var(--accent)" }}>Summary</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>Get a structured revision summary from one or multiple indexed documents.</p>
      </div>

      {pdfs.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ color: "var(--text-muted)" }}>No documents indexed yet. Upload a PDF first.</div>
        </Card>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Documents {selectedPdfs.length > 0 && <span style={{ color: "var(--accent)", marginLeft: 6 }}>({selectedPdfs.length} selected)</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              {pdfs.map(p => {
                const isSelected = selectedPdfs.find(sp => sp.id === p.id);
                return (
                  <Card 
                    key={p.id} 
                    onClick={() => togglePdf(p)} 
                    style={{
                      padding: "14px 16px", 
                      textAlign: "center",
                      border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: isSelected ? "var(--accent-glow)" : "var(--bg-card)",
                      position: "relative",
                    }}
                  >
                    <div style={{ 
                      position: "absolute", 
                      top: 8, 
                      right: 8, 
                      width: 20, 
                      height: 20, 
                      borderRadius: "50%", 
                      background: isSelected ? "var(--accent)" : "var(--border)",
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: 12,
                      transition: "all 0.2s",
                    }}>
                      {isSelected && "✓"}
                    </div>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Btn onClick={handleSummary} loading={loading} disabled={selectedPdfs.length === 0}>
            {loading ? "Generating…" : `Generate Summary from ${selectedPdfs.length || "1"} Document${selectedPdfs.length !== 1 ? "s" : ""} →`}
          </Btn>

          {summary && (
            <div className="fade-up" style={{ marginTop: 28 }}>
              <Card style={{ padding: "28px 32px" }}>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 14.5, lineHeight: 1.85,
                  color: "var(--text)", whiteSpace: "pre-wrap",
                }}>
                  {summary}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Quiz Tab ─────────────────────────────────────────────────────────────────

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const MODES = ["Notes Only", "Notes + PYQ"];

const DiffBadge = ({ d, active, onClick }) => {
  const colors = { Easy: "green", Medium: "warn", Hard: "pink" };
  return (
    <div onClick={onClick} style={{
      padding: "8px 20px", borderRadius: 100, fontSize: 13, fontWeight: 500,
      cursor: "pointer", transition: "all 0.2s",
      border: active ? "none" : "1px solid var(--border)",
      background: active
        ? d === "Easy" ? "rgba(77,217,172,0.18)" : d === "Medium" ? "rgba(255,209,102,0.18)" : "rgba(255,107,157,0.18)"
        : "transparent",
      color: active
        ? d === "Easy" ? "var(--success)" : d === "Medium" ? "var(--warn)" : "var(--accent-2)"
        : "var(--text-muted)",
      boxShadow: active ? `0 0 0 1px ${d === "Easy" ? "rgba(77,217,172,0.3)" : d === "Medium" ? "rgba(255,209,102,0.3)" : "rgba(255,107,157,0.3)"}` : "none",
    }}>
      {d === "Easy" ? "🟢" : d === "Medium" ? "🟡" : "🔴"} {d}
    </div>
  );
};

const QuizTab = ({ pdfs, userId }) => {
  const [selectedPdfs, setSelectedPdfs] = useState([]);
  const [difficulty, setDifficulty] = useState("Medium");
  const [mode, setMode] = useState("Notes Only");
  const [pyqFile, setPyqFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  const [score, setScore] = useState(0);
  const pyqRef = useRef();

  const togglePdf = (pdf) => {
    setSelectedPdfs(prev => {
      const exists = prev.find(p => p.id === pdf.id);
      if (exists) {
        return prev.filter(p => p.id !== pdf.id);
      } else {
        return [...prev, pdf];
      }
    });
  };

  const handleGenerate = async () => {
    if (selectedPdfs.length === 0) return;
    setLoading(true); setQuiz(null); setAnswers({}); setChecked({}); setScore(0);
    let pyqText = "";
    if (mode === "Notes + PYQ" && pyqFile) {
      const fd = new FormData();
      fd.append("file", pyqFile);
      try {
        const r = await apiFetch("/extract-text", { method: "POST", body: fd });
        pyqText = r.text;
      } catch (_) {}
    }
    try {
      const pdfIds = selectedPdfs.map(p => p.id);
      const { quiz: q } = await generateQuiz(pdfIds, userId, difficulty, mode, pyqText);
      setQuiz(q);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = (i) => {
    if (checked[i]) return;
    const q = quiz[i];
    const isCorrect = answers[i]?.startsWith(q.answer);
    setChecked(c => ({ ...c, [i]: { correct: isCorrect, answer: q.answer, explanation: q.explanation } }));
    if (isCorrect) setScore(s => s + 1);
  };

  const allChecked = quiz && Object.keys(checked).length === quiz.length;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Practice <span style={{ color: "var(--accent)" }}>Quiz</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 15 }}>AI-generated MCQs tailored to your notes and preferred difficulty.</p>
      </div>

      {pdfs.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "48px 32px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <div style={{ color: "var(--text-muted)" }}>Upload and index a PDF first to generate quizzes.</div>
        </Card>
      ) : (
        <>
          {!quiz && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Select Documents {selectedPdfs.length > 0 && <span style={{ color: "var(--accent)", marginLeft: 6 }}>({selectedPdfs.length} selected)</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {pdfs.map(p => {
                    const isSelected = selectedPdfs.find(sp => sp.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => togglePdf(p)} 
                        style={{
                          padding: "8px 14px", 
                          borderRadius: "var(--radius)", 
                          fontSize: 13, 
                          cursor: "pointer",
                          border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                          background: isSelected ? "var(--accent-glow)" : "transparent",
                          color: isSelected ? "var(--accent-bright)" : "var(--text-muted)",
                          transition: "all 0.15s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: 4,
                          border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                          background: isSelected ? "var(--accent)" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                        }}>
                          {isSelected && "✓"}
                        </div>
                        📄 {p.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Difficulty</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {DIFFICULTIES.map(d => <DiffBadge key={d} d={d} active={difficulty === d} onClick={() => setDifficulty(d)} />)}
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Mode</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {MODES.map(m => (
                    <div key={m} onClick={() => setMode(m)} style={{
                      padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: "pointer",
                      border: mode === m ? "1px solid var(--border-accent)" : "1px solid var(--border)",
                      background: mode === m ? "var(--accent-glow)" : "transparent",
                      color: mode === m ? "var(--accent-bright)" : "var(--text-muted)",
                      transition: "all 0.15s",
                    }}>{m}</div>
                  ))}
                </div>
              </div>

              {mode === "Notes + PYQ" && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Upload PYQ PDF</div>
                  <div
                    onClick={() => pyqRef.current.click()}
                    style={{
                      border: `1.5px dashed ${pyqFile ? "var(--accent-3)" : "var(--border)"}`,
                      borderRadius: "var(--radius)", padding: "16px 20px", cursor: "pointer",
                      background: pyqFile ? "rgba(77,217,172,0.04)" : "transparent",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                    <input ref={pyqRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPyqFile(e.target.files[0])} />
                    <span style={{ fontSize: 18 }}>{pyqFile ? "📄" : "⬆️"}</span>
                    <span style={{ fontSize: 13, color: pyqFile ? "var(--success)" : "var(--text-muted)" }}>
                      {pyqFile ? pyqFile.name : "Click to upload PYQ PDF"}
                    </span>
                  </div>
                </div>
              )}

              <Btn onClick={handleGenerate} loading={loading} disabled={selectedPdfs.length === 0}>
                {loading ? "Generating Quiz…" : `Generate 10 Questions from ${selectedPdfs.length || "1"} Document${selectedPdfs.length !== 1 ? "s" : ""} →`}
              </Btn>
            </Card>
          )}

          {quiz && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 24, padding: "14px 20px", borderRadius: "var(--radius-lg)",
                background: "var(--bg-card)", border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>{score}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Correct</div>
                  </div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{Object.keys(checked).length}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Answered</div>
                  </div>
                  <div style={{ width: 1, background: "var(--border)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{quiz.length}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Total</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {allChecked && (
                    <Tag color={score / quiz.length > 0.7 ? "green" : score / quiz.length > 0.4 ? "warn" : "pink"}>
                      {Math.round(score / quiz.length * 100)}% Score
                    </Tag>
                  )}
                  <Btn variant="ghost" onClick={() => setQuiz(null)} style={{ fontSize: 13, padding: "7px 14px" }}>New Quiz</Btn>
                </div>
              </div>

              <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width 0.4s ease",
                  width: `${(Object.keys(checked).length / quiz.length) * 100}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                }} />
              </div>

              {quiz.map((q, i) => {
                const c = checked[i];
                return (
                  <Card key={i} style={{ marginBottom: 16, border: c ? `1px solid ${c.correct ? "rgba(77,217,172,0.25)" : "rgba(255,107,107,0.25)"}` : "1px solid var(--border)" }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: c ? (c.correct ? "rgba(77,217,172,0.15)" : "rgba(255,107,107,0.15)") : "var(--accent-glow)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 600,
                        color: c ? (c.correct ? "var(--success)" : "var(--error)") : "var(--accent-bright)",
                      }}>
                        {c ? (c.correct ? "✓" : "✗") : i + 1}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>{q.question}</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                      {q.options.map((opt, j) => {
                        const isSelected = answers[i] === opt;
                        const isAnswer = c && opt.startsWith(c.answer);
                        const isWrong = c && isSelected && !c.correct;
                        return (
                          <div
                            key={j}
                            onClick={() => !c && setAnswers(a => ({ ...a, [i]: opt }))}
                            style={{
                              padding: "11px 16px", borderRadius: "var(--radius)", fontSize: 14,
                              cursor: c ? "default" : "pointer", transition: "all 0.15s",
                              border: isAnswer && c ? "1px solid rgba(77,217,172,0.4)"
                                : isWrong ? "1px solid rgba(255,107,107,0.3)"
                                  : isSelected ? "1px solid var(--border-accent)"
                                    : "1px solid var(--border)",
                              background: isAnswer && c ? "rgba(77,217,172,0.07)"
                                : isWrong ? "rgba(255,107,107,0.07)"
                                  : isSelected ? "var(--accent-glow)"
                                    : "var(--bg-elevated)",
                              color: isAnswer && c ? "var(--success)"
                                : isWrong ? "var(--error)"
                                  : isSelected ? "var(--text)"
                                    : "var(--text-muted)",
                            }}
                          >
                            {opt}
                          </div>
                        );
                      })}
                    </div>

                    {!c ? (
                      <Btn
                        variant="outline"
                        disabled={!answers[i]}
                        onClick={() => handleCheck(i)}
                        style={{ fontSize: 13, padding: "8px 16px" }}
                      >
                        Check Answer
                      </Btn>
                    ) : (
                      c.explanation && (
                        <div style={{
                          padding: "10px 14px", borderRadius: "var(--radius)",
                          background: "rgba(124,107,255,0.06)", border: "1px solid var(--border)",
                          fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6,
                        }}>
                          💡 {c.explanation}
                        </div>
                      )
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── App Shell ────────────────────────────────────────────────────────────────

/**
 * LegacyApp — the original LearnLens V2 AI tools, preserved end-to-end.
 *
 * Two usage modes:
 *   <LegacyApp />                          → standalone (its own sidebar + tabs)
 *   <LegacyApp embedded activeTab="chat"   → mounted inside the academic-OS
 *              setActiveTab={...} />          shell; legacy sidebar hidden, tab
 *                                             controlled externally.
 *
 * The FastAPI backend integration is unchanged.
 */
export default function LegacyApp({
  embedded = false,
  activeTab: extActive,
  setActiveTab: extSet,
} = {}) {
  const [intActive, setIntActive] = useState("upload");
  const activeTab = extActive ?? intActive;
  const setActiveTab = extSet ?? setIntActive;
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const userId = "test_user";

  useEffect(() => {
    listPDFs(userId).then(r => setPdfs(r.pdfs || [])).catch(() => {});
  }, []);

  const handleIngested = (pdf) => {
    setPdfs(p => [...p.filter(x => x.id !== pdf.id), pdf]);
    setSelectedPdf(pdf);
    setActiveTab("chat");
  };

  const body = (
    <main style={{ flex: 1, overflowY: "auto", padding: embedded ? "24px 32px" : "40px 48px" }}>
      {activeTab === "upload"  && <UploadTab onIngested={handleIngested} pdfs={pdfs} />}
      {activeTab === "chat"    && <ChatTab userId={userId} />}
      {activeTab === "summary" && <SummaryTab pdfs={pdfs} userId={userId} />}
      {activeTab === "quiz"    && <QuizTab pdfs={pdfs} userId={userId} />}
    </main>
  );

  if (embedded) {
    return (
      <div className="ll-legacy" style={{ display: "flex", minHeight: "100%" }}>
        <GlobalStyle />
        {body}
      </div>
    );
  }

  return (
    <div className="ll-legacy">
      <GlobalStyle />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar
          active={activeTab}
          setActive={setActiveTab}
          pdfs={pdfs}
          selectedPdf={selectedPdf}
          setSelectedPdf={setSelectedPdf}
        />
        {body}
      </div>
    </div>
  );
}


// ── Named exports for the academic-OS shell to reuse the FastAPI integration.
export {
  apiFetch,
  uploadPDF,
  ingestPDF,
  askQuestion,
  generateSummary,
  generateQuiz,
  listPDFs,
};
