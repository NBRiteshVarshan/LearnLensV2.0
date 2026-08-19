import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: "loading", user: null, _expiredMsg: null });
  const booted = useRef(false);

  // On mount: resolve session from backend
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAuth({ status: "authenticated", user: d.user, _expiredMsg: null });
        } else {
          setAuth({ status: "unauthenticated", user: null, _expiredMsg: null });
        }
      })
      .catch(() => {
        setAuth({ status: "unauthenticated", user: null, _expiredMsg: null });
      });
  }, []);

  // Intercept 401s on protected API calls so any expired session auto-returns to login
  useEffect(() => {
    const orig = window.fetch;
    window.fetch = async function (input, init) {
      const response = await orig(input, init);
      if (response.status === 401) {
        const urlStr =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.href
            : input?.url || "";
        if (urlStr.includes("/api/") && !urlStr.includes("/api/auth/")) {
          setAuth((prev) =>
            prev.status === "authenticated"
              ? {
                  status: "unauthenticated",
                  user: null,
                  _expiredMsg: "Your session has expired. Please sign in again.",
                }
              : prev
          );
        }
      }
      return response;
    };
    return () => {
      window.fetch = orig;
    };
  }, []);

  const login = (user) => setAuth({ status: "authenticated", user, _expiredMsg: null });

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setAuth({ status: "unauthenticated", user: null, _expiredMsg: null });
  };

  return (
    <AuthCtx.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
