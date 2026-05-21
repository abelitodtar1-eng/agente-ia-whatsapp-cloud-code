"use client";
import { useState, useEffect } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";




function WebhookField({
  label, icon, description, field, placeholder,
}: {
  label: string; icon: string; description: string;
  field: "inventario" | "contabilidad" | "vendedora";
  placeholder: string;
}) {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<"idle"|"saving"|"testing"|"ok"|"error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/webhook")
      .then(r => r.json())
      .then((d: Record<string, string>) => { setUrl(d[field] ?? ""); setSaved(d[field] ?? ""); });
  }, [field]);

  async function handleSave() {
    setStatus("saving"); setMsg("");
    const res = await fetch("/api/settings/webhook", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: url }),
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (data.ok) { setSaved(url); setStatus("ok"); setMsg("Guardado"); }
    else { setStatus("error"); setMsg(data.error ?? "Error al guardar"); }
  }

  async function handleTest() {
    setStatus("testing"); setMsg("");
    try {
      const res = await fetch("/api/test-webhook", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json() as { ok?: boolean; status?: number; preview?: string; error?: string };
      if (data.ok) {
        setStatus("ok"); setMsg(`✓ ${data.status} — ${data.preview ?? "(sin body)"}`);
      } else {
        setStatus("error"); setMsg(data.error ?? `Error ${data.status ?? res.status}`);
      }
    } catch (e) {
      setStatus("error"); setMsg(e instanceof Error ? e.message : "Error de red");
    }
  }

  const dirty = url !== saved;
  const accentColor = field === "inventario" ? TEAL : field === "vendedora" ? "#ff9f43" : "#ffd166";

  const msgStyle = status === "ok"
    ? { background: "rgba(0,212,170,.08)", border: `1px solid rgba(0,212,170,.2)`, color: TEAL }
    : status === "error"
    ? { background: "rgba(255,107,107,.08)", border: `1px solid rgba(255,107,107,.2)`, color: RED }
    : { background: "rgba(108,99,255,.08)", border: `1px solid rgba(108,99,255,.2)`, color: PRP };

  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</span>
        <span style={{ fontSize: 10, color: accentColor, background: `${accentColor}18`, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
          {field}
        </span>
      </div>
      <p style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>{description}</p>

      <div style={{ marginBottom: 12 }}>
        <input
          type="url" value={url}
          onChange={e => { setUrl(e.target.value); setStatus("idle"); setMsg(""); }}
          placeholder={placeholder}
          style={{ width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" as const }}
          onFocus={e => { e.target.style.borderColor = accentColor; }}
          onBlur={e => { e.target.style.borderColor = BORD; }}
        />
        {dirty && <p style={{ fontSize: 11, color: "#ffd166", marginTop: 5 }}>⚠ Cambios sin guardar</p>}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: msg ? 12 : 0 }}>
        <button onClick={handleSave} disabled={!url.trim() || status === "saving"}
          style={{ padding: "8px 18px", fontSize: 12, fontWeight: 600, background: accentColor, color: "#0a0c10", border: "none", borderRadius: 8, cursor: (!url.trim() || status === "saving") ? "not-allowed" : "pointer", opacity: (!url.trim() || status === "saving") ? .5 : 1 }}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
        <button onClick={handleTest} disabled={!url.trim() || status === "testing"}
          style={{ padding: "8px 18px", fontSize: 12, fontWeight: 600, background: "transparent", color: MUTED, border: `1px solid ${BORD}`, borderRadius: 8, cursor: (!url.trim() || status === "testing") ? "not-allowed" : "pointer", opacity: (!url.trim() || status === "testing") ? .5 : 1 }}>
          {status === "testing" ? "Probando..." : "Probar"}
        </button>
      </div>

      {msg && <div style={{ ...msgStyle, padding: "10px 14px", borderRadius: 8, fontSize: 12, marginTop: 10 }}>{msg}</div>}

      {saved && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORD}` }}>
          <p style={{ fontSize: 10, color: MUTED }}>URL activa:</p>
          <p style={{ fontSize: 11, fontFamily: "monospace", color: TEXT, wordBreak: "break-all", marginTop: 3 }}>{saved}</p>
        </div>
      )}
    </div>
  );
}

export function WebhookView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORD}`, background: CARD }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Configuración Webhooks</h2>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
          El triage rutea cada mensaje al workflow n8n correspondiente según el contenido.
        </p>
      </div>

      <div style={{ padding: "24px", maxWidth: 640 }}>
        <div style={{ background: "rgba(108,99,255,.06)", border: `1px solid rgba(108,99,255,.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
          <strong style={{ color: TEXT }}>¿Cómo funciona el enrutamiento?</strong><br />
          Inventario → mensajes sobre stock, productos, entradas/salidas, kardex.<br />
          Contabilidad → mensajes sobre cobros, pagos, saldos, facturas, finanzas.<br />
          Vendedora → mensajes sobre ventas, clientes, cotizaciones, precios y ofertas.
        </div>

        <WebhookField
          field="inventario"
          icon="🏭"
          label="Webhook Inventario"
          description="Workflow n8n para consultas de stock, productos, entradas/salidas y pedidos."
          placeholder="https://tu-n8n.host/webhook/inventario-id"
        />

        <WebhookField
          field="contabilidad"
          icon="📊"
          label="Webhook Contabilidad"
          description="Workflow n8n para cobros, pagos, saldos y estado financiero."
          placeholder="https://tu-n8n.host/webhook/contabilidad-id"
        />

        <WebhookField
          field="vendedora"
          icon="🛍️"
          label="Webhook Vendedora"
          description="Workflow n8n para ventas, clientes nuevos, cotizaciones y ofertas."
          placeholder="https://tu-n8n.host/webhook/vendedora-id"
        />

      </div>
    </div>
  );
}
