"use client";
import { useState, useEffect, useCallback } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e"; const PRP = "#6c63ff";
const TEAL = "#00d4aa"; const RED = "#ff6b6b"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";
const AMBER = "#f59e0b";

interface StatusItem {
  id: number;
  image_path: string;
  caption: string;
  sent: number;
  contacts_count: number;
  created_at: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusCard({ item, onDeleted }: { item: StatusItem; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar este estado del historial?`)) return;
    setDeleting(true);
    await fetch("/api/admin/status-queue", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id }) });
    onDeleted();
  }

  const isPending = item.sent === 0;

  return (
    <div style={{
      background: CARD, border: `1px solid ${isPending ? AMBER : BORD}`,
      borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column",
      boxShadow: isPending ? `0 0 0 1px ${AMBER}33` : "none",
      transition: "border-color .2s",
    }}>
      {/* imagen */}
      <div style={{ position: "relative", aspectRatio: "9/16", background: BG, overflow: "hidden", maxHeight: 280 }}>
        <img
          src={`/api/admin/status-queue/${item.id}/imagen`}
          alt={item.caption}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* badge estado */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: isPending ? AMBER : TEAL,
          color: "#0a0c10", fontSize: 10, fontWeight: 700,
          borderRadius: 20, padding: "3px 9px",
        }}>
          {isPending ? "⏳ Pendiente" : "✓ Enviado"}
        </div>
      </div>

      {/* info */}
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <p style={{ fontSize: 12, color: TEXT, margin: 0, lineHeight: 1.5, whiteSpace: "pre-line" }}>
          {item.caption || <span style={{ color: MUTED, fontStyle: "italic" }}>Sin texto</span>}
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: "auto", paddingTop: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: MUTED }}>📅 {formatTime(item.created_at)}</span>
          {!isPending && (
            <span style={{ fontSize: 10, color: TEAL }}>👥 {item.contacts_count} contactos</span>
          )}
        </div>
      </div>

      {/* acciones */}
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${BORD}`, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: "5px 12px", fontSize: 11, background: "transparent", color: RED, border: `1px solid rgba(255,107,107,.3)`, borderRadius: 7, cursor: "pointer", opacity: deleting ? .5 : 1 }}
        >
          🗑 Eliminar
        </button>
      </div>
    </div>
  );
}

export function NovedadesView() {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/status-queue");
    if (res.ok) {
      setItems(await res.json() as StatusItem[]);
      setLastUpdated(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const pending = items.filter(i => i.sent === 0);
  const sent = items.filter(i => i.sent === 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", background: BG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${BORD}`, background: CARD, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: TEXT, margin: 0 }}>Novedades — Estados WhatsApp</h2>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 3, marginBottom: 0 }}>
            Historial de estados enviados al número WA. Auto-actualiza cada 5s.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastUpdated && (
            <span style={{ fontSize: 10, color: MUTED }}>↻ {lastUpdated.toLocaleTimeString("es-ES")}</span>
          )}
          <button onClick={load} style={{ padding: "6px 14px", fontSize: 11, fontWeight: 600, background: PRP, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer" }}>
            Actualizar
          </button>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1100, width: "100%" }}>
        {loading ? (
          <p style={{ fontSize: 12, color: MUTED }}>Cargando...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUTED, fontSize: 12 }}>
            Sin estados en el historial. Publica uno desde Catálogo o Productos.
          </div>
        ) : (
          <>
            {/* resumen */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { label: "Total", value: items.length, color: TEXT },
                { label: "Enviados", value: sent.length, color: TEAL },
                { label: "Pendientes", value: pending.length, color: pending.length > 0 ? AMBER : MUTED },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "12px 20px", minWidth: 100, textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{label}</p>
                </div>
              ))}
              {sent.length > 0 && (
                <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 10, padding: "12px 20px", minWidth: 140, textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: TEAL, margin: 0 }}>
                    {Math.round(sent.reduce((s, i) => s + i.contacts_count, 0) / sent.length)}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Prom. contactos</p>
                </div>
              )}
            </div>

            {/* pendientes primero */}
            {pending.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: AMBER, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                  ⏳ En cola ({pending.length})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
                  {pending.map(item => <StatusCard key={item.id} item={item} onDeleted={load} />)}
                </div>
              </>
            )}

            {/* enviados */}
            {sent.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                  ✓ Enviados ({sent.length})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                  {sent.map(item => <StatusCard key={item.id} item={item} onDeleted={load} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
