"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Error al iniciar sesión");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0c10",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 380, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>
            <span style={{ color: "#6c63ff" }}>Invent</span>Bot CRM
          </h1>
          <p style={{ fontSize: 13, color: "#8892a4", marginTop: 6 }}>Sistema de Gestión DTAR</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#1a1d27", border: "1px solid #2a2d3e",
          borderRadius: 16, padding: "32px 28px",
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 24 }}>
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8892a4", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                style={{
                  width: "100%", background: "#0a0c10", border: "1px solid #2a2d3e",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#6c63ff"; }}
                onBlur={e => { e.target.style.borderColor = "#2a2d3e"; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: "#8892a4", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{
                  width: "100%", background: "#0a0c10", border: "1px solid #2a2d3e",
                  borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
                  fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
                onFocus={e => { e.target.style.borderColor = "#6c63ff"; }}
                onBlur={e => { e.target.style.borderColor = "#2a2d3e"; }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(255,107,107,.08)", border: "1px solid rgba(255,107,107,.2)",
                borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#ff6b6b", marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", background: "#6c63ff", color: "#fff", border: "none",
                borderRadius: 8, padding: "11px", fontSize: 14, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
                transition: "all .2s",
              }}
            >
              {loading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#8892a4", marginTop: 20 }}>
          DTAR · Sistema Interno
        </p>
      </div>
    </div>
  );
}
