import React, { useState, useEffect, useRef } from "react";

export function AuthScreen({ onAuth, msg }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(msg || "");

  const nameRef  = useRef(null);
  const emailRef = useRef(null);

  // Focus first field when mode switches
  useEffect(() => {
    const ref = mode === "signup" ? nameRef : emailRef;
    setTimeout(() => ref.current?.focus(), 30);
  }, [mode]);

  // Propagate the expired-session message when it arrives
  useEffect(() => {
    if (msg) setError(msg);
  }, [msg]);

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirm("");
  };

  const validate = () => {
    if (!email.trim() || !password) return "Email and password are required";
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      return "Invalid email address";
    }
    if (mode === "signup") {
      if (!name.trim()) return "Name is required";
      if (password.length < 8) return "Password must be at least 8 characters";
      if (password !== confirm) return "Passwords do not match";
    }
    return null;
  };

  const submit = async () => {
    if (loading) return;
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError("");

    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email: email.trim().toLowerCase(), password }
          : { email: email.trim().toLowerCase(), password, name: name.trim() };

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await r.json();

      if (!r.ok) {
        setError(data.detail || "An error occurred. Please try again.");
        return;
      }

      if (data.authenticated) onAuth(data.user);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") submit(); };

  const inp = (focus) => ({
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--line)",
    borderRadius: "var(--r)",
    fontSize: "var(--fs-14)",
    fontFamily: "var(--font-sans)",
    background: "var(--surface)",
    color: "var(--ink)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 120ms",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "min(420px, 100%)",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)",
          padding: "32px",
          animation: "ll-fade-in 200ms ease",
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--ink)",
              display: "inline-grid",
              placeItems: "center",
              color: "var(--bg)",
              fontFamily: "var(--font-serif)",
              fontWeight: 600,
              fontSize: 24,
              marginBottom: 14,
            }}
          >
            L
          </div>
          <div
            style={{
              fontSize: "var(--fs-20)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
              lineHeight: 1.2,
            }}
          >
            LearnLens
          </div>
          <div
            style={{
              fontSize: "var(--fs-13)",
              color: "var(--ink-3)",
              marginTop: 5,
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
            }}
          >
            Your personal learning OS
          </div>
        </div>

        {/* Mode tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-2)",
            borderRadius: "var(--r)",
            padding: 3,
            marginBottom: 22,
          }}
        >
          {[
            { id: "login",  label: "Sign in" },
            { id: "signup", label: "Create account" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchMode(id)}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: "var(--r-sm)",
                background: mode === id ? "var(--surface)" : "transparent",
                color: mode === id ? "var(--ink)" : "var(--ink-3)",
                fontSize: "var(--fs-13)",
                fontWeight: mode === id ? 500 : 400,
                border: mode === id ? "1px solid var(--line)" : "1px solid transparent",
                boxShadow: mode === id ? "var(--shadow-sm)" : "none",
                transition: "background 150ms, color 150ms",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 12px",
              background: "var(--due-soft)",
              border: "1px solid color-mix(in oklch, var(--due) 30%, var(--line))",
              borderRadius: "var(--r)",
              fontSize: "var(--fs-13)",
              color: "var(--due)",
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div>
              <label
                htmlFor="ll-name"
                className="label-xs"
                style={{ display: "block", marginBottom: 6 }}
              >
                Full name
              </label>
              <input
                id="ll-name"
                ref={nameRef}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKey}
                placeholder="e.g. Saksham Kumar"
                style={inp()}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="ll-email"
              className="label-xs"
              style={{ display: "block", marginBottom: 6 }}
            >
              Email address
            </label>
            <input
              id="ll-email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onKey}
              placeholder="you@university.edu"
              style={inp()}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
            />
          </div>

          <div>
            <label
              htmlFor="ll-password"
              className="label-xs"
              style={{ display: "block", marginBottom: 6 }}
            >
              Password
            </label>
            <input
              id="ll-password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={mode === "login" ? onKey : undefined}
              placeholder={mode === "signup" ? "At least 8 characters" : ""}
              style={inp()}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label
                htmlFor="ll-confirm"
                className="label-xs"
                style={{ display: "block", marginBottom: 6 }}
              >
                Confirm password
              </label>
              <input
                id="ll-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={onKey}
                placeholder="Repeat your password"
                style={inp()}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-line)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--line)")}
              />
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 16px",
              marginTop: 4,
              borderRadius: "var(--r)",
              fontSize: "var(--fs-14)",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              background: loading ? "var(--accent-soft)" : "var(--accent)",
              color: loading ? "var(--accent)" : "var(--on-accent)",
              border: loading ? "1px solid var(--accent-line)" : "1px solid transparent",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 150ms, color 150ms",
            }}
          >
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
              ? "Sign in"
              : "Create account"}
          </button>
        </div>

        {/* Footer link */}
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            fontSize: "var(--fs-13)",
            color: "var(--ink-3)",
          }}
        >
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => switchMode("signup")}
                style={{
                  color: "var(--accent)",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                style={{
                  color: "var(--accent)",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontSize: "inherit",
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
