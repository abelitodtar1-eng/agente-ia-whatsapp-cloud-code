"use client";
import { useState, useEffect, useCallback } from "react";
import { SheetIdConfig } from "./SheetIdConfig";

interface Kpis {
  totalProductos: number;
  valorTotal: number;
  sinStock: number;
  solicitar: number;
  ok: number;
  criticos: number;
  comprar7dias: number;
}

interface Producto {
  CÓDIGO: number;
  CATEGORÍA: string;
  DESCRIPCIÓN: string;
  UdM: string;
  ALMACÉN: string;
  STOCK_MÍN: number;
  INVENTARIO: number;
  COSTO_UNIT_PROM: number;
  VALOR_TOTAL: number;
  ESTADO: string;
  velocidadDiaria: number;
  diasRestantes: number | null;
  abc: "A" | "B" | "C";
  urgencia: "CRITICO" | "COMPRAR" | "SOLICITAR" | "OK";
}

interface Movimiento {
  id: string;
  fecha: string;
  tipo: string;
  codigo: number;
  producto: string;
  entrada: number | null;
  salida: number | null;
  precioUnit: number;
  valorTotal: number;
}

interface DashboardData {
  kpis: Kpis;
  productos: Producto[];
  ultimosMovimientos: Movimiento[];
}

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG    = "#0a0c10";
const CARD  = "#1a1d27";
const BORD  = "#2a2d3e";
const TEAL  = "#00d4aa";
const RED   = "#ff6b6b";
const YELL  = "#ffd166";
const PRP   = "#6c63ff";
const TEXT  = "#e2e8f0";
const MUTED = "#8892a4";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtK(n: number | null | undefined) {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("es-ES");
}
function fmt2(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function diasLabel(d: number | null) {
  if (d === null) return "—";
  if (d > 365)   return ">1 año";
  return `${d}d`;
}
function urgColor(u: string) {
  if (u === "CRITICO")  return RED;
  if (u === "COMPRAR")  return "#ea580c";
  if (u === "SOLICITAR") return YELL;
  return TEAL;
}
function catRatioColor(ok: number, total: number) {
  const r = ok / total;
  if (r === 1)   return TEAL;
  if (r >= 0.5)  return YELL;
  return RED;
}
function tipoColor(t: string) {
  if (t === "ENTRADA") return { bg: "rgba(0,212,170,.12)", color: TEAL };
  if (t === "SALIDA")  return { bg: "rgba(255,107,107,.12)", color: RED };
  return { bg: `rgba(108,99,255,.12)`, color: PRP };
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string | number; sub: string; accent: string; icon: string;
}) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORD}`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 12, padding: "16px 18px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{sub}</div>
      <div style={{ position: "absolute", right: 12, top: 12, fontSize: 22, opacity: .1 }}>{icon}</div>
    </div>
  );
}

// ─── Horizontal bar helper ────────────────────────────────────────────────────
function HBar({ pct, color, h = 6 }: { pct: number; color: string; h?: number }) {
  return (
    <div style={{ flex: 1, height: h, background: BORD, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: 3, transition: "width .4s" }} />
    </div>
  );
}

// ─── Estado por categoría ────────────────────────────────────────────────────
function EstadoPorCategoria({ catAgg }: { catAgg: { cat: string; total: number; conStock: number; valor: number }[] }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>Estado por categoría</div>
      {catAgg.map(({ cat, total, conStock }) => {
        const color = catRatioColor(conStock, total);
        const pct = (conStock / total) * 100;
        return (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${BORD}`, fontSize: 13 }}>
            <div style={{ minWidth: 120, color: MUTED, fontSize: 12 }}>{cat}</div>
            <HBar pct={pct} color={color} h={8} />
            <div style={{ minWidth: 36, textAlign: "right", fontWeight: 700, color, fontSize: 12 }}>{conStock}/{total}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Nivel de stock por producto ──────────────────────────────────────────────
function NivelDeStock({ productos }: { productos: Producto[] }) {
  const active = productos.filter(p => p.INVENTARIO > 0).slice(0, 8);
  const maxInv = Math.max(...active.map(p => p.INVENTARIO), 1);
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>Nivel de stock — activos</div>
      {active.map((p) => {
        const pct = (p.INVENTARIO / maxInv) * 100;
        const color = urgColor(p.urgencia);
        const label = p.DESCRIPCIÓN.length > 18 ? p.DESCRIPCIÓN.slice(0, 17) + "…" : p.DESCRIPCIÓN;
        return (
          <div key={p.CÓDIGO} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${BORD}`, fontSize: 12 }}>
            <div style={{ minWidth: 120, color: TEXT }}>{label}</div>
            <HBar pct={pct} color={color} h={6} />
            <div style={{ minWidth: 36, textAlign: "right", fontWeight: 700, color, fontSize: 12 }}>{p.INVENTARIO}</div>
            <div style={{ minWidth: 42, textAlign: "right", fontSize: 11, color: p.diasRestantes !== null && p.diasRestantes < 7 ? RED : MUTED }}>
              {diasLabel(p.diasRestantes)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Valor por categoría ──────────────────────────────────────────────────────
function ValorPorCategoria({ catAgg }: { catAgg: { cat: string; valor: number }[] }) {
  const maxVal = Math.max(...catAgg.map(c => c.valor), 1);
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>Valor por categoría</div>
      {catAgg.map(({ cat, valor }) => (
        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${BORD}`, fontSize: 12 }}>
          <div style={{ minWidth: 120, color: MUTED }}>{cat}</div>
          <HBar pct={(valor / maxVal) * 100} color={PRP} h={6} />
          <div style={{ minWidth: 64, textAlign: "right", fontWeight: 700, color: TEXT, fontSize: 12 }}>{fmtK(valor)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Top productos por valor ──────────────────────────────────────────────────
function TopProductos({ productos }: { productos: Producto[] }) {
  const top = [...productos].sort((a, b) => b.VALOR_TOTAL - a.VALOR_TOTAL).slice(0, 5);
  const maxVal = Math.max(...top.map(p => p.VALOR_TOTAL), 1);
  return (
    <div style={{ background: CARD, border: `1px solid ${BORD}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 14 }}>Top 5 productos por valor</div>
      {top.map((p) => {
        const label = p.DESCRIPCIÓN.length > 18 ? p.DESCRIPCIÓN.slice(0, 17) + "…" : p.DESCRIPCIÓN;
        return (
          <div key={p.CÓDIGO} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${BORD}`, fontSize: 12 }}>
            <div style={{ minWidth: 120, color: TEXT }}>{label}</div>
            <HBar pct={(p.VALOR_TOTAL / maxVal) * 100} color={TEAL} h={6} />
            <div style={{ minWidth: 64, textAlign: "right", fontWeight: 700, color: TEAL, fontSize: 12 }}>{fmtK(p.VALOR_TOTAL)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Alert block ─────────────────────────────────────────────────────────────
function AlertBlock({ productos }: { productos: Producto[] }) {
  const criticos = productos.filter(p => p.urgencia === "CRITICO");
  const comprar  = productos.filter(p => p.urgencia === "COMPRAR");
  if (criticos.length === 0 && comprar.length === 0) return null;
  return (
    <div style={{ background: "rgba(255,107,107,.06)", border: `1px solid rgba(255,107,107,.2)`, borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 10 }}>Alertas críticas — requerir atención</div>
      {criticos.length > 0 && (
        <div style={{ fontSize: 13, color: MUTED, display: "flex", gap: 6, marginBottom: 4 }}>
          <span style={{ color: RED }}>●</span>
          <span>
            <strong style={{ color: TEXT }}>{criticos.length} producto{criticos.length > 1 ? "s" : ""} con menos de 3 días de stock</strong>
            {": "}{criticos.map(p => `${p.DESCRIPCIÓN} (${diasLabel(p.diasRestantes)})`).join(", ")}
          </span>
        </div>
      )}
      {comprar.length > 0 && (
        <div style={{ fontSize: 13, color: MUTED, display: "flex", gap: 6 }}>
          <span style={{ color: YELL }}>●</span>
          <span>
            <strong style={{ color: TEXT }}>{comprar.length} producto{comprar.length > 1 ? "s" : ""} por comprar esta semana</strong>
            {": "}{comprar.map(p => `${p.DESCRIPCIÓN} (${diasLabel(p.diasRestantes)})`).join(", ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Pill badges ──────────────────────────────────────────────────────────────
function UrgPill({ u }: { u: string }) {
  const color = urgColor(u);
  const label = u === "CRITICO" ? "🔴 CRÍTICO" : u === "COMPRAR" ? "🟠 COMPRAR" : u === "SOLICITAR" ? "⚠️ SOLICITAR" : "✅ OK";
  return (
    <span style={{ background: `${color}1a`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}
function AbcPill({ abc }: { abc: "A" | "B" | "C" }) {
  const color = abc === "A" ? PRP : abc === "B" ? TEAL : MUTED;
  return (
    <span style={{ background: `${color}1a`, color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{abc}</span>
  );
}

// ─── Filter constants ─────────────────────────────────────────────────────────
const URGENCIA_FILTERS = [
  { label: "Todos", value: "Todos" },
  { label: "🔴 Crítico", value: "CRITICO" },
  { label: "🟠 Comprar", value: "COMPRAR" },
  { label: "⚠️ Solicitar", value: "SOLICITAR" },
  { label: "✅ OK", value: "OK" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardView() {
  const [data,  setData]  = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,  setError]  = useState<string | null>(null);
  const [view,   setView]   = useState<"inventario" | "movimientos">("inventario");
  const [catFilter, setCatFilter]       = useState("Todos");
  const [urgenciaFilter, setUrgFilter]  = useState("Todos");
  const [search, setSearch]             = useState("");
  const [rates, setRates] = useState<{ USD: number | null; MLC: number | null; EUR: number | null } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/rates").then(r => r.ok ? r.json() : null).then((d: { USD: number | null; MLC: number | null; EUR: number | null } | null) => setRates(d));
    const ratesInterval = setInterval(() => {
      fetch("/api/rates").then(r => r.ok ? r.json() : null).then((d: { USD: number | null; MLC: number | null; EUR: number | null } | null) => setRates(d));
    }, 60_000);
    return () => clearInterval(ratesInterval);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: BG }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${PRP}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: BG, color: RED, fontSize: 13 }}>{error}</div>
  );

  if (!data) return null;

  const { kpis, productos, ultimosMovimientos } = data;

  // ── Derived data ──────────────────────────────────────────────────────────
  const sortedByUrgency = [...productos].sort((a, b) => {
    const rank = (u: string) => u === "CRITICO" ? 0 : u === "COMPRAR" ? 1 : u === "SOLICITAR" ? 2 : 3;
    return rank(a.urgencia) - rank(b.urgencia);
  });

  const catAgg = Array.from(new Set(productos.map(p => p.CATEGORÍA)))
    .map(cat => {
      const prods = productos.filter(p => p.CATEGORÍA === cat);
      return {
        cat,
        total:    prods.length,
        conStock: prods.filter(p => p.INVENTARIO > 0).length,
        valor:    prods.reduce((s, p) => s + (Number(p.VALOR_TOTAL) || 0), 0),
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const categories = ["Todos", ...catAgg.map(c => c.cat)];

  const filtered = sortedByUrgency.filter(p => {
    const catOk  = catFilter === "Todos" || p.CATEGORÍA === catFilter;
    const urgOk  = urgenciaFilter === "Todos" || p.urgencia === urgenciaFilter;
    const schOk  = search === "" || p.DESCRIPCIÓN.toLowerCase().includes(search.toLowerCase());
    return catOk && urgOk && schOk;
  });

  const pctSinStock = kpis.totalProductos > 0
    ? Math.round((kpis.sinStock / kpis.totalProductos) * 100)
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, color: TEXT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORD}`, padding: "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>
          <span style={{ color: PRP }}>Invent</span>Bot — Inventario Lucius
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {rates && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>El Toque</span>
              {rates.USD != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: TEAL, background: "rgba(0,212,170,.1)", padding: "3px 12px", borderRadius: 20 }}>
                  $ {rates.USD.toFixed(0)}
                </span>
              )}
              {rates.EUR != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: PRP, background: "rgba(108,99,255,.1)", padding: "3px 12px", borderRadius: 20 }}>
                  € {rates.EUR.toFixed(0)}
                </span>
              )}
              {rates.MLC != null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: YELL, background: "rgba(255,209,102,.1)", padding: "3px 12px", borderRadius: 20 }}>
                  MLC {rates.MLC.toFixed(0)}
                </span>
              )}
            </div>
          )}
          <span style={{ color: MUTED, fontSize: 12 }}>{new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</span>
          <span style={{ background: PRP, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 20, letterSpacing: ".5px" }}>
            {kpis.totalProductos} PRODUCTOS
          </span>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: MUTED }}>
              ↻ {lastUpdated.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            style={{ background: "transparent", border: `1px solid ${BORD}`, color: MUTED, fontSize: 11, padding: "4px 12px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .5 : 1 }}
          >
            {loading ? "..." : "Actualizar"}
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>

        <SheetIdConfig />

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
          <KpiCard label="Sin stock"        value={kpis.sinStock}            sub={`${pctSinStock}% del catálogo vacío`}          accent={RED}   icon="🚨" />
          <KpiCard label="Críticos (< 3d)"  value={kpis.criticos}            sub="Requieren acción inmediata"                     accent={RED}   icon="⚡" />
          <KpiCard label="Nivel correcto"   value={kpis.ok}                  sub="Productos en buen estado"                       accent={TEAL}  icon="✔" />
          <KpiCard label="Valor inventario" value={`${fmtK(kpis.valorTotal)} CUP`} sub={`${catAgg.length} categorías activas`}   accent={PRP}   icon="💰" />
        </div>

        {/* Charts row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 12 }}>
          <EstadoPorCategoria catAgg={catAgg} />
          <NivelDeStock productos={sortedByUrgency} />
        </div>

        {/* Charts row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, marginBottom: 18 }}>
          <ValorPorCategoria catAgg={catAgg} />
          <TopProductos productos={productos} />
        </div>

        {/* Alert block */}
        <AlertBlock productos={sortedByUrgency} />

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${BORD}`, marginBottom: 0 }}>
          {(["inventario", "movimientos"] as const).map(t => (
            <button
              key={t}
              onClick={() => setView(t)}
              style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: "transparent", border: "none", borderBottom: `2px solid ${view === t ? PRP : "transparent"}`,
                color: view === t ? PRP : MUTED, transition: "all .2s",
              }}
            >
              {t === "inventario" ? "Inventario" : "Últimos movimientos"}
            </button>
          ))}
        </div>

        {/* Filters (inventario tab) */}
        {view === "inventario" && (
          <div style={{ background: CARD, border: `1px solid ${BORD}`, borderTop: "none", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 2 }}>
            {/* Category pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>Cat.</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  style={{
                    fontSize: 10, padding: "3px 10px", borderRadius: 20, cursor: "pointer", border: "1px solid",
                    background: catFilter === cat ? PRP : "transparent",
                    borderColor: catFilter === cat ? PRP : BORD,
                    color: catFilter === cat ? "#fff" : MUTED,
                  }}
                >{cat}</button>
              ))}
            </div>
            {/* Urgencia pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px" }}>Urgencia</span>
              {URGENCIA_FILTERS.map(uf => (
                <button
                  key={uf.value}
                  onClick={() => setUrgFilter(uf.value)}
                  style={{
                    fontSize: 10, padding: "3px 10px", borderRadius: 20, cursor: "pointer", border: "1px solid",
                    background: urgenciaFilter === uf.value ? PRP : "transparent",
                    borderColor: urgenciaFilter === uf.value ? PRP : BORD,
                    color: urgenciaFilter === uf.value ? "#fff" : MUTED,
                  }}
                >{uf.label}</button>
              ))}
            </div>
            {/* Search */}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              style={{
                background: BG, border: `1px solid ${BORD}`, borderRadius: 8,
                padding: "5px 12px", color: TEXT, fontSize: 12, outline: "none", width: 180,
              }}
            />
            {(catFilter !== "Todos" || urgenciaFilter !== "Todos" || search !== "") && (
              <span style={{ fontSize: 11, color: MUTED }}>
                {filtered.length}/{productos.length}
                <button
                  onClick={() => { setCatFilter("Todos"); setUrgFilter("Todos"); setSearch(""); }}
                  style={{ marginLeft: 8, background: "transparent", border: "none", color: PRP, cursor: "pointer", fontSize: 11 }}
                >
                  Limpiar
                </button>
              </span>
            )}
          </div>
        )}

        {/* Table */}
        <div style={{ background: CARD, border: `1px solid ${BORD}`, borderTop: view === "inventario" ? "none" : `1px solid ${BORD}`, borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {view === "inventario" ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["Código", "Descripción", "Cat.", "UdM", "Mín", "Inventario", "Costo prom", "Valor total", "Vel/día", "Días", "ABC", "Acción"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: "24px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                      Sin resultados para los filtros seleccionados
                    </td>
                  </tr>
                ) : filtered.map((p, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: `1px solid ${BORD}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "9px 12px", color: MUTED, fontFamily: "monospace", fontSize: 11 }}>{p.CÓDIGO}</td>
                    <td style={{ padding: "9px 12px", color: TEXT, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.DESCRIPCIÓN}</td>
                    <td style={{ padding: "9px 12px", color: MUTED }}>{p.CATEGORÍA}</td>
                    <td style={{ padding: "9px 12px", color: MUTED }}>{p.UdM}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: MUTED }}>{p.STOCK_MÍN}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color: TEXT }}>{p.INVENTARIO}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: MUTED }}>{fmt2(p.COSTO_UNIT_PROM)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: TEXT }}>{fmt2(p.VALOR_TOTAL)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", color: MUTED }}>
                      {p.velocidadDiaria === 0 ? "—" : p.velocidadDiaria < 1 ? `${(p.velocidadDiaria * 7).toFixed(1)}/sem` : `${p.velocidadDiaria.toFixed(1)}/d`}
                    </td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 600, color:
                      p.diasRestantes === null ? MUTED :
                      p.diasRestantes < 3  ? RED :
                      p.diasRestantes < 7  ? "#ea580c" :
                      p.diasRestantes < 14 ? YELL : TEAL
                    }}>
                      {diasLabel(p.diasRestantes)}
                    </td>
                    <td style={{ padding: "9px 12px" }}><AbcPill abc={p.abc} /></td>
                    <td style={{ padding: "9px 12px" }}><UrgPill u={p.urgencia} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORD}` }}>
                  {["ID", "Fecha", "Tipo", "Código", "Producto", "Entrada", "Salida", "Precio", "Valor"].map(h => (
                    <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimosMovimientos.map((m, i) => {
                  const tc = tipoColor(String(m.tipo));
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${BORD}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "9px 12px", color: MUTED, fontFamily: "monospace", fontSize: 10 }}>{m.id}</td>
                      <td style={{ padding: "9px 12px", color: MUTED, whiteSpace: "nowrap" }}>{String(m.fecha).slice(0, 10)}</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{ background: tc.bg, color: tc.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{m.tipo}</span>
                      </td>
                      <td style={{ padding: "9px 12px", color: MUTED, fontFamily: "monospace" }}>{m.codigo}</td>
                      <td style={{ padding: "9px 12px", color: TEXT, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.producto}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: TEAL, fontWeight: 600 }}>{m.entrada ?? "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: RED, fontWeight: 600 }}>{m.salida ?? "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: MUTED }}>{m.precioUnit != null ? fmt2(Number(m.precioUnit)) : "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", color: TEXT }}>{m.valorTotal != null ? fmt2(Number(m.valorTotal)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
