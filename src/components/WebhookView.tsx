"use client";
import { useState, useEffect } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

function EnzonaConfig() {
  const [ck, setCk] = useState(""); const [cs, setCs] = useState(""); const [mu, setMu] = useState("");
  const [status, setStatus] = useState<"idle"|"saving"|"ok"|"error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/enzona").then(r => r.json()).then((d: { consumerKey: string; consumerSecret: string; merchantUuid: string }) => {
      setCk(d.consumerKey ?? ""); setCs(d.consumerSecret ?? ""); setMu(d.merchantUuid ?? "");
    });
  }, []);

  async function save() {
    setStatus("saving"); setMsg("");
    const res = await fetch("/api/settings/enzona", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consumerKey: ck, consumerSecret: cs, merchantUuid: mu }) });
    const d = await res.json() as { ok?: boolean; error?: string };
    if (d.ok) { setStatus("ok"); setMsg("Guardado"); } else { setStatus("error"); setMsg(d.error ?? "Error"); }
  }

  const inputStyle = { width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" as const };

  return (
    <div style={{ background: CARD, border: `1px solid rgba(108,99,255,.25)`, borderRadius: 10, padding: "18px 20px", marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 14 }}>💳</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Enzona — Pasarela de Pagos</span>
        <span style={{ fontSize: 10, color: PRP, background: "rgba(108,99,255,.1)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Cuba</span>
      </div>
      <p style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
        Obtén las credenciales en <strong style={{ color: TEXT }}>api.enzona.net/store</strong> · Registra tu comercio en <strong style={{ color: TEXT }}>bulevar.enzona.net</strong>
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div>
          <label style={{ display: "block", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Consumer Key</label>
          <input value={ck} onChange={e => setCk(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = PRP; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Consumer Secret</label>
          <input value={cs} onChange={e => setCs(e.target.value)} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" type="password" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = PRP; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Merchant UUID</label>
          <input value={mu} onChange={e => setMu(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style={inputStyle}
            onFocus={e => { e.target.style.borderColor = PRP; }} onBlur={e => { e.target.style.borderColor = BORD; }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={save} disabled={!ck||!cs||!mu||status==="saving"} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", opacity: (!ck||!cs||!mu||status==="saving") ? .5 : 1 }}>
          {status === "saving" ? "Guardando..." : "Guardar"}
        </button>
        {msg && <span style={{ fontSize: 12, color: status === "ok" ? TEAL : RED }}>{msg}</span>}
      </div>
    </div>
  );
}

function EstadosTokenSection() {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/settings/estados-token")
      .then(r => r.json())
      .then((d: { token: string }) => setToken(d.token ?? ""));
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: CARD, border: `1px solid rgba(0,212,170,.25)`, borderRadius: 10, padding: "18px 20px", marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>📸</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Token — Automatización Estados</span>
        <span style={{ fontSize: 10, color: TEAL, background: "rgba(0,212,170,.1)", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>n8n</span>
      </div>
      <p style={{ fontSize: 11, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
        Usa este token en n8n como header <code style={{ color: TEXT }}>Authorization: Bearer &lt;token&gt;</code> para llamar a <code style={{ color: TEXT }}>POST /api/admin/estados/publish</code>.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          readOnly
          value={token}
          style={{ flex: 1, background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 12, fontFamily: "monospace", outline: "none" }}
        />
        <button
          onClick={copy}
          style={{ padding: "9px 16px", fontSize: 12, fontWeight: 600, background: copied ? TEAL : "transparent", color: copied ? "#0a0c10" : TEAL, border: `1px solid ${TEAL}`, borderRadius: 8, cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap" }}
        >
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function WebhookField({
  label, icon, description, field, placeholder,
}: {
  label: string; icon: string; description: string;
  field: "inventario" | "contabilidad";
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
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "test@s.whatsapp.net", message: "ping" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        setStatus("ok"); setMsg(`✓ ${res.status} — ${JSON.stringify(data).slice(0, 60)}`);
      } else { setStatus("error"); setMsg(`Error ${res.status}`); }
    } catch (e) { setStatus("error"); setMsg(`Sin respuesta: ${e instanceof Error ? e.message : String(e)}`); }
  }

  const dirty = url !== saved;
  const accentColor = field === "inventario" ? TEAL : "#ffd166";

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
          Contabilidad → mensajes sobre cobros, pagos, saldos, facturas, finanzas.
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

        <EnzonaConfig />
        <EstadosTokenSection />
      </div>
    </div>
  );
}
