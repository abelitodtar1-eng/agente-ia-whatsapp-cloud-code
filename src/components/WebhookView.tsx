"use client";
import { useState, useEffect, useCallback } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

const ALL_EVENTS = [
  "MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE",
  "CONNECTION_UPDATE", "QRCODE_UPDATED", "CONTACTS_UPSERT", "CONTACTS_UPDATE",
  "CHATS_UPSERT", "CHATS_UPDATE", "CHATS_DELETE", "GROUPS_UPSERT",
  "GROUP_UPDATE", "GROUP_PARTICIPANTS_UPDATE", "PRESENCE_UPDATE",
  "CALL", "APPLICATION_STARTUP",
];

interface Instance { id: string; name: string; status: string; profile: string }
interface WebhookCfg { url: string; enabled: boolean; events: string[] }

function StatusDot({ status }: { status: string }) {
  const color = status === "open" ? TEAL : status === "connecting" ? "#ffd166" : RED;
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, marginRight: 6 }} />;
}

function EvoWebhookSection() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selected, setSelected] = useState("");
  const [cfg, setCfg] = useState<WebhookCfg | null>(null);
  const [url, setUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [events, setEvents] = useState<string[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings/evo-webhook")
      .then(r => r.json())
      .then((data: Instance[] | { error: string }) => {
        if (Array.isArray(data)) {
          setInstances(data);
          if (data.length > 0) setSelected(data[0].name);
        } else {
          setLoadErr(data.error);
        }
      })
      .catch(() => setLoadErr("Sin conexión a Evolution API"));
  }, []);

  const loadConfig = useCallback((instance: string) => {
    setStatus("loading"); setCfg(null); setMsg("");
    fetch(`/api/settings/evo-webhook?instance=${encodeURIComponent(instance)}`)
      .then(r => r.json())
      .then((data: WebhookCfg & { error?: string }) => {
        if (data.error) { setLoadErr(data.error); setStatus("idle"); return; }
        setCfg(data);
        setUrl(data.url ?? "");
        setEnabled(data.enabled ?? true);
        setEvents(data.events ?? []);
        setStatus("idle");
      })
      .catch(() => { setLoadErr("Error cargando config"); setStatus("idle"); });
  }, []);

  useEffect(() => {
    if (selected) loadConfig(selected);
  }, [selected, loadConfig]);

  function toggleEvent(ev: string) {
    setEvents(prev => prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]);
    setMsg(""); setStatus("idle");
  }

  async function handleSave() {
    setStatus("saving"); setMsg("");
    try {
      const res = await fetch("/api/settings/evo-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance: selected, url, enabled, events }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) { setStatus("ok"); setMsg("✓ Webhook actualizado en Evolution API"); setCfg({ url, enabled, events }); }
      else { setStatus("error"); setMsg(data.error ?? "Error al guardar"); }
    } catch { setStatus("error"); setMsg("Error de red"); }
  }

  const dirty = cfg && (url !== cfg.url || enabled !== cfg.enabled || JSON.stringify([...events].sort()) !== JSON.stringify([...cfg.events].sort()));

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 3, height: 18, background: TEAL, borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Webhooks de Entrada — Evolution API</span>
      </div>

      {loadErr && (
        <div style={{ background: "rgba(255,107,107,.08)", border: `1px solid rgba(255,107,107,.2)`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: RED, marginBottom: 16 }}>
          ⚠ {loadErr}
        </div>
      )}

      {instances.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
          {/* Instance selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>Instancia</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {instances.map(inst => (
                <button key={inst.id} onClick={() => setSelected(inst.name)}
                  style={{
                    padding: "6px 14px", fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: "pointer",
                    background: selected === inst.name ? "rgba(0,212,170,.12)" : "transparent",
                    border: `1px solid ${selected === inst.name ? TEAL : BORD}`,
                    color: selected === inst.name ? TEAL : MUTED,
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                  <StatusDot status={inst.status} />
                  {inst.name}
                  {inst.profile && <span style={{ color: MUTED, fontWeight: 400 }}>· {inst.profile}</span>}
                </button>
              ))}
            </div>
          </div>

          {status === "loading" && (
            <div style={{ fontSize: 12, color: MUTED, padding: "12px 0" }}>Cargando configuración...</div>
          )}

          {cfg !== null && status !== "loading" && (
            <>
              {/* Enabled toggle */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: MUTED }}>Habilitado</label>
                <div onClick={() => { setEnabled(e => !e); setMsg(""); setStatus("idle"); }}
                  style={{ width: 36, height: 20, borderRadius: 10, background: enabled ? TEAL : BORD, cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </div>
                <span style={{ fontSize: 11, color: enabled ? TEAL : MUTED }}>{enabled ? "Activo" : "Desactivado"}</span>
              </div>

              {/* URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>URL Destino</label>
                <input type="url" value={url}
                  onChange={e => { setUrl(e.target.value); setMsg(""); setStatus("idle"); }}
                  placeholder="https://tu-n8n.host/webhook/..."
                  style={{ width: "100%", background: BG, border: `1px solid ${BORD}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontSize: 12, fontFamily: "monospace", outline: "none", boxSizing: "border-box" as const }}
                  onFocus={e => { e.target.style.borderColor = TEAL; }}
                  onBlur={e => { e.target.style.borderColor = BORD; }}
                />
              </div>

              {/* Events */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, color: MUTED }}>Eventos</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setEvents([...ALL_EVENTS]); setMsg(""); setStatus("idle"); }}
                      style={{ fontSize: 10, color: TEAL, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Todos</button>
                    <button onClick={() => { setEvents([]); setMsg(""); setStatus("idle"); }}
                      style={{ fontSize: 10, color: MUTED, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>Ninguno</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {ALL_EVENTS.map(ev => (
                    <label key={ev} onClick={() => toggleEvent(ev)}
                      style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "5px 8px", borderRadius: 6, background: events.includes(ev) ? "rgba(0,212,170,.06)" : "transparent", border: `1px solid ${events.includes(ev) ? "rgba(0,212,170,.2)" : "transparent"}` }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${events.includes(ev) ? TEAL : BORD}`, background: events.includes(ev) ? TEAL : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {events.includes(ev) && <span style={{ fontSize: 9, color: BG, fontWeight: 900 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: events.includes(ev) ? TEXT : MUTED }}>{ev}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Save */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={handleSave} disabled={status === "saving"}
                  style={{ padding: "8px 20px", fontSize: 12, fontWeight: 600, background: TEAL, color: BG, border: "none", borderRadius: 8, cursor: status === "saving" ? "not-allowed" : "pointer", opacity: status === "saving" ? .6 : 1 }}>
                  {status === "saving" ? "Guardando..." : "Guardar"}
                </button>
                {dirty && <span style={{ fontSize: 11, color: "#ffd166" }}>⚠ Cambios sin guardar</span>}
              </div>

              {msg && (
                <div style={{
                  marginTop: 12, padding: "10px 14px", borderRadius: 8, fontSize: 12,
                  ...(status === "ok"
                    ? { background: "rgba(0,212,170,.08)", border: `1px solid rgba(0,212,170,.2)`, color: TEAL }
                    : { background: "rgba(255,107,107,.08)", border: `1px solid rgba(255,107,107,.2)`, color: RED }),
                }}>{msg}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function WebhookField({
  label, icon, description, field, placeholder,
}: {
  label: string; icon: string; description: string;
  field: "inventario" | "contabilidad" | "vendedora";
  placeholder: string;
}) {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "testing" | "ok" | "error">("idle");
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
      if (data.ok) { setStatus("ok"); setMsg(`✓ ${data.status} — ${data.preview ?? "(sin body)"}`); }
      else { setStatus("error"); setMsg(data.error ?? `Error ${data.status ?? res.status}`); }
    } catch (e) { setStatus("error"); setMsg(e instanceof Error ? e.message : "Error de red"); }
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
        <span style={{ fontSize: 10, color: accentColor, background: `${accentColor}18`, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{field}</span>
      </div>
      <p style={{ fontSize: 11, color: MUTED, marginBottom: 14 }}>{description}</p>

      <div style={{ marginBottom: 12 }}>
        <input type="url" value={url}
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
          Entrada: configura dónde Evolution API envía eventos. Salida: configura dónde el triage enruta cada mensaje.
        </p>
      </div>

      <div style={{ padding: "24px", maxWidth: 700 }}>
        <EvoWebhookSection />

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 3, height: 18, background: PRP, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Webhooks de Salida — n8n</span>
        </div>

        <div style={{ background: "rgba(108,99,255,.06)", border: `1px solid rgba(108,99,255,.2)`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 11, color: MUTED, lineHeight: 1.7 }}>
          <strong style={{ color: TEXT }}>¿Cómo funciona el enrutamiento?</strong><br />
          Inventario → mensajes sobre stock, productos, entradas/salidas, kardex.<br />
          Contabilidad → mensajes sobre cobros, pagos, saldos, facturas, finanzas.<br />
          Vendedora → mensajes sobre ventas, clientes, cotizaciones, precios y ofertas.
        </div>

        <WebhookField field="inventario" icon="🏭" label="Webhook Inventario"
          description="Workflow n8n para consultas de stock, productos, entradas/salidas y pedidos."
          placeholder="https://tu-n8n.host/webhook/inventario-id" />

        <WebhookField field="contabilidad" icon="📊" label="Webhook Contabilidad"
          description="Workflow n8n para cobros, pagos, saldos y estado financiero."
          placeholder="https://tu-n8n.host/webhook/contabilidad-id" />

        <WebhookField field="vendedora" icon="🛍️" label="Webhook Vendedora"
          description="Workflow n8n para ventas, clientes nuevos, cotizaciones y ofertas."
          placeholder="https://tu-n8n.host/webhook/vendedora-id" />
      </div>
    </div>
  );
}
