"use client";
import { useState, useEffect } from "react";

const BG = "#0a0c10"; const CARD = "#1a1d27"; const BORD = "#2a2d3e";
const PRP = "#6c63ff"; const TEAL = "#00d4aa"; const RED = "#ff6b6b";
const YELL = "#ffd166"; const TEXT = "#e2e8f0"; const MUTED = "#8892a4";

interface HomeConv {
  id: number; phone: string; phone_alias: string | null; name: string | null;
  mode: string; unread_count: number; last_message_at: number | null;
}
interface PendingPayment {
  id: number; description: string; amount: number; created_at: number;
  contact_name: string | null; contact_phone: string; phone_alias: string | null;
}
interface HomeData {
  unreadTotal: number; conversations: HomeConv[];
  pendingPayments: PendingPayment[]; pendingCount: number;
  ventasHoy: number; ventasTotal: number;
  totalContactos: number; totalFacturas: number; mensajesHoy: number;
}
interface Rates { USD: number | null; MLC: number | null; EUR: number | null }
interface CriticalProduct { DESCRIPCIÓN: string; diasRestantes: number | null; urgencia: string }

function timeAgo(ts: number | null) {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function KpiCard({ icon, label, value, accent }: { icon: string; label: string; value: number | string; accent: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderTop: `3px solid ${accent}`, borderRadius: 12, padding: "18px 20px", flex: 1 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>
    </div>
  );
}

export function HomeView({ onGoToConversation }: { onGoToConversation: (id: number) => void }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [home, setHome] = useState<HomeData | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [criticals, setCriticals] = useState<CriticalProduct[]>([]);
  const [totalProductos, setTotalProductos] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  useEffect(() => {
    fetch(`/api/home?date=${selectedDate}`).then(r => r.ok ? r.json() : null).then((d: HomeData | null) => setHome(d));
  }, [selectedDate]);

  useEffect(() => {
    fetch("/api/rates").then(r => r.ok ? r.json() : null).then((d: Rates | null) => setRates(d));
    fetch("/api/dashboard").then(r => r.ok ? r.json() : null).then((d: { productos?: CriticalProduct[]; kpis?: { totalProductos?: number } } | null) => {
      if (d?.productos) setCriticals(d.productos.filter(p => p.urgencia === "CRITICO" || p.urgencia === "COMPRAR"));
      if (d?.kpis?.totalProductos != null) setTotalProductos(d.kpis.totalProductos);
    });
  }, []);

  const displayName = (c: HomeConv) => c.name ?? c.phone_alias ?? c.phone;

  return (
    <div style={{ height: "100%", overflowY: "auto", background: BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Top bar — siempre visible */}
      <div style={{ background: "#12141e", borderBottom: `1px solid ${BORD}`, padding: "8px 24px", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>El Toque</span>
        {rates?.USD != null && <span style={{ fontSize: 14, fontWeight: 700, color: TEAL, background: "rgba(0,212,170,.1)", padding: "3px 12px", borderRadius: 20 }}>$ {rates.USD.toFixed(0)}</span>}
        {rates?.EUR != null && <span style={{ fontSize: 14, fontWeight: 700, color: PRP, background: "rgba(108,99,255,.1)", padding: "3px 12px", borderRadius: 20 }}>€ {rates.EUR.toFixed(0)}</span>}
        {rates?.MLC != null && <span style={{ fontSize: 14, fontWeight: 700, color: YELL, background: "rgba(255,209,102,.1)", padding: "3px 12px", borderRadius: 20 }}>MLC {rates.MLC.toFixed(0)}</span>}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 8, padding: "4px 10px", color: TEXT, fontSize: 12, outline: "none", cursor: "pointer" }}
          />
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              style={{ fontSize: 11, color: TEAL, background: "rgba(0,212,170,.1)", border: `1px solid rgba(0,212,170,.2)`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
            >Hoy</button>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* KPI row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
          <KpiCard icon="📨" label="Sin leer" value={home?.unreadTotal ?? "—"} accent={home?.unreadTotal ? RED : TEAL} />
          <KpiCard icon="💳" label="Cobros pendientes" value={home?.pendingCount ?? "—"} accent={home?.pendingCount ? YELL : TEAL} />
          <KpiCard icon="🛒" label="Ventas (Hoy)" value={home?.ventasHoy ?? "—"} accent={home?.ventasHoy ? TEAL : MUTED} />
          <KpiCard icon="📦" label="Comprar esta semana" value={criticals.filter(p => p.urgencia === "COMPRAR").length || "—"} accent={YELL} />
        </div>
        {/* KPI row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          <KpiCard icon="👤" label="Contactos" value={home?.totalContactos ?? "—"} accent={PRP} />
          <KpiCard icon="🧾" label="Facturas" value={home?.totalFacturas ?? "—"} accent={PRP} />
          <KpiCard icon="📊" label="Productos" value={totalProductos ?? "—"} accent={TEAL} />
          <KpiCard icon="💬" label="Mensajes (Hoy)" value={home?.mensajesHoy ?? "—"} accent={MUTED} />
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>

          {/* Recent conversations */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORD}`, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>
              Últimas conversaciones
            </div>
            {home?.conversations.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>Sin conversaciones</div>
            )}
            {home?.conversations.map(c => (
              <div
                key={c.id}
                onClick={() => onGoToConversation(c.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${BORD}`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: c.unread_count > 0 ? 700 : 400, color: c.unread_count > 0 ? TEXT : MUTED }}>
                    {displayName(c)}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{timeAgo(c.last_message_at)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {c.unread_count > 0 && (
                    <span style={{ background: RED, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {c.unread_count}
                    </span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.mode === "AI" ? TEAL : YELL, background: c.mode === "AI" ? "rgba(0,212,170,.12)" : "rgba(255,209,102,.12)", padding: "2px 7px", borderRadius: 20 }}>
                    {c.mode}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pending payments */}
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORD}`, fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>
              Cobros pendientes
            </div>
            {home?.pendingPayments.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>Sin cobros pendientes</div>
            )}
            {home?.pendingPayments.map(p => (
              <div key={p.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${BORD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>{p.description}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                    {p.contact_name ?? p.phone_alias ?? p.contact_phone} · {timeAgo(p.created_at)}
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: YELL }}>{Math.round(p.amount).toLocaleString("es-ES")} CUP</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory alerts */}
        {criticals.length > 0 && (
          <div style={{ background: "rgba(255,107,107,.06)", border: `1px solid rgba(255,107,107,.2)`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>
              Alertas de inventario
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {criticals.map((p, i) => {
                const color = p.urgencia === "CRITICO" ? RED : YELL;
                const dias = p.diasRestantes != null ? `${p.diasRestantes}d` : "sin datos";
                return (
                  <span key={i} style={{ background: `${color}1a`, color, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: `1px solid ${color}33` }}>
                    {p.urgencia === "CRITICO" ? "🔴" : "🟠"} {p.DESCRIPCIÓN} — {dias}
                  </span>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
