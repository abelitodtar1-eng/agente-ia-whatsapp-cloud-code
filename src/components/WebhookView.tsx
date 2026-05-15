"use client";
import { useState, useEffect } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

export function WebhookView() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/webhook")
      .then((r) => r.json())
      .then((d: { url: string }) => { setUrl(d.url ?? ""); setSaved(d.url ?? ""); });
  }, []);

  async function handleSave() {
    setStatus("saving"); setMsg("");
    const res = await fetch("/api/settings/webhook", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (data.ok) { setSaved(url); setStatus("ok"); setMsg("Guardado correctamente"); }
    else { setStatus("error"); setMsg(data.error ?? "Error al guardar"); }
  }

  async function handleTest() {
    setStatus("testing"); setMsg("");
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "test@s.whatsapp.net", message: "ping" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        setStatus("ok"); setMsg(`✓ Respondió ${res.status} — ${JSON.stringify(data).slice(0, 80)}`);
      } else { setStatus("error"); setMsg(`Error ${res.status}`); }
    } catch (e) { setStatus("error"); setMsg(`Sin respuesta: ${e instanceof Error ? e.message : String(e)}`); }
  }

  const dirty = url !== saved;

  const msgBg = status === "ok"
    ? { background: "rgba(0,212,170,.08)", border: `1px solid rgba(0,212,170,.2)`, color: TEAL }
    : status === "error"
    ? { background: "rgba(255,107,107,.08)", border: `1px solid rgba(255,107,107,.2)`, color: RED }
    : { background: "rgba(108,99,255,.08)", border: `1px solid rgba(108,99,255,.2)`, color: PRP };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORD}`, background: CARD }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Configuración Webhook</h2>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>URL del webhook n8n al que se envían los mensajes entrantes de WhatsApp</p>
      </div>

      <div style={{ padding: "24px", maxWidth: 640 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>URL del Webhook</label>
          <input
            type="url" value={url}
            onChange={(e) => { setUrl(e.target.value); setStatus("idle"); setMsg(""); }}
            placeholder="https://tu-n8n.host/webhook/..."
            style={{ width: "100%", background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = PRP; }}
            onBlur={(e) => { e.target.style.borderColor = BORD; }}
          />
          {dirty && <p style={{ fontSize: 11, color: "#ffd166", marginTop: 6 }}>⚠ Cambios sin guardar</p>}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleSave}
            disabled={!url.trim() || status === "saving"}
            style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: (!url.trim() || status === "saving") ? "not-allowed" : "pointer", opacity: (!url.trim() || status === "saving") ? .5 : 1 }}
          >
            {status === "saving" ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={handleTest}
            disabled={!url.trim() || status === "testing"}
            style={{ padding: "9px 20px", fontSize: 13, fontWeight: 600, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 8, cursor: (!url.trim() || status === "testing") ? "not-allowed" : "pointer", opacity: (!url.trim() || status === "testing") ? .5 : 1 }}
          >
            {status === "testing" ? "Probando..." : "Probar conexión"}
          </button>
        </div>

        {msg && (
          <div style={{ ...msgBg, padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 20 }}>{msg}</div>
        )}

        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "16px 18px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 8 }}>¿Cómo funciona?</p>
          <ul style={{ fontSize: 11, color: MUTED, lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
            <li>Cada mensaje entrante de WhatsApp hace un POST a esta URL</li>
            <li>El body es <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{"{ phone, message }"}</code></li>
            <li>El webhook debe responder <code style={{ background: "rgba(255,255,255,.06)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>{'{ response: "..." }'}</code></li>
            <li>Tiempo máximo de respuesta: 60 segundos</li>
          </ul>
          {saved && (
            <div style={{ paddingTop: 12, marginTop: 12, borderTop: `1px solid ${BORD}` }}>
              <p style={{ fontSize: 11, color: MUTED }}>URL activa:</p>
              <p style={{ fontSize: 11, fontFamily: "monospace", color: TEXT, wordBreak: "break-all", marginTop: 4 }}>{saved}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
