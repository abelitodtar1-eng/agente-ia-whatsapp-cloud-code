"use client";
import { useState, useEffect, useCallback } from "react";

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

function fmt(n: number) {
  return n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVel(v: number) {
  if (v === 0) return "—";
  if (v < 1) return `${(v * 7).toFixed(1)}/sem`;
  return `${v.toFixed(1)}/d`;
}

function diasLabel(dias: number | null) {
  if (dias === null) return "—";
  if (dias > 365) return ">1 año";
  return `${dias}d`;
}

function diasCls(dias: number | null) {
  if (dias === null) return "text-gray-400";
  if (dias < 3) return "text-red-600 font-bold";
  if (dias < 7) return "text-orange-600 font-semibold";
  if (dias < 14) return "text-amber-600";
  return "text-emerald-600";
}

function urgenciaBarColor(urgencia: string) {
  if (urgencia === "CRITICO") return "#dc2626";
  if (urgencia === "COMPRAR") return "#ea580c";
  if (urgencia === "SOLICITAR") return "#d97706";
  return "#10b981";
}

function tipoColor(tipo: string) {
  if (tipo === "ENTRADA") return "bg-emerald-100 text-emerald-700";
  if (tipo === "SALIDA") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

function AbcBadge({ abc }: { abc: "A" | "B" | "C" }) {
  const cls =
    abc === "A" ? "bg-blue-100 text-blue-800" :
    abc === "B" ? "bg-emerald-100 text-emerald-700" :
    "bg-gray-100 text-gray-500";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{abc}</span>;
}

function UrgenciaBadge({ urgencia }: { urgencia: string }) {
  const cls =
    urgencia === "CRITICO"  ? "bg-red-100 text-red-700" :
    urgencia === "COMPRAR"  ? "bg-orange-100 text-orange-700" :
    urgencia === "SOLICITAR"? "bg-amber-100 text-amber-700" :
    "bg-emerald-100 text-emerald-700";
  const short =
    urgencia === "CRITICO"  ? "🔴 CRÍTICO" :
    urgencia === "COMPRAR"  ? "🟠 COMPRAR" :
    urgencia === "SOLICITAR"? "⚠️ SOLICITAR" :
    "✅ OK";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${cls}`}>{short}</span>;
}

function AlertaBanner({ productos }: { productos: Producto[] }) {
  const criticos = productos.filter((p) => p.urgencia === "CRITICO");
  const comprar  = productos.filter((p) => p.urgencia === "COMPRAR");
  if (criticos.length === 0 && comprar.length === 0) return null;

  return (
    <div className="mx-5 mb-2 rounded-lg border overflow-hidden shrink-0 text-xs">
      {criticos.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-start gap-3">
          <span className="font-semibold text-red-700 shrink-0 whitespace-nowrap">🔴 CRÍTICO</span>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {criticos.map((p) => (
              <span key={p.CÓDIGO} className="text-red-600">
                {p.DESCRIPCIÓN.length > 22 ? p.DESCRIPCIÓN.slice(0, 21) + "…" : p.DESCRIPCIÓN}
                {" · "}<strong>{diasLabel(p.diasRestantes)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
      {comprar.length > 0 && (
        <div className="bg-orange-50 px-4 py-2 flex items-start gap-3">
          <span className="font-semibold text-orange-700 shrink-0 whitespace-nowrap">🟠 COMPRAR esta semana</span>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {comprar.map((p) => (
              <span key={p.CÓDIGO} className="text-orange-600">
                {p.DESCRIPCIÓN.length > 22 ? p.DESCRIPCIÓN.slice(0, 21) + "…" : p.DESCRIPCIÓN}
                {" · "}<strong>{diasLabel(p.diasRestantes)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StockChart({ productos }: { productos: Producto[] }) {
  const maxInv = Math.max(...productos.map((p) => p.INVENTARIO), 1);
  const rowH   = 32;
  const labelW = 140;
  const barW   = 240;
  const annW   = 90; // inventario + días
  const totalW = labelW + barW + annW;
  const totalH = productos.length * rowH + 8;

  return (
    <div className="px-5 pb-2 shrink-0">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">Stock actual vs mínimo</p>
      <div className="bg-white border border-gray-200 rounded-lg p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          width="100%"
          style={{ minWidth: 380 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {productos.map((p, i) => {
            const y      = i * rowH + 4;
            const invPct = Math.min(p.INVENTARIO / maxInv, 1);
            const minPct = Math.min(p.STOCK_MÍN / maxInv, 1);
            const invPx  = invPct * barW;
            const minPx  = minPct * barW;
            const color  = urgenciaBarColor(p.urgencia);
            const label  = p.DESCRIPCIÓN.length > 16 ? p.DESCRIPCIÓN.slice(0, 15) + "…" : p.DESCRIPCIÓN;
            const dias   = diasLabel(p.diasRestantes);

            return (
              <g key={i}>
                <text x={labelW - 6} y={y + 14} textAnchor="end" fontSize={10} fill="#6b7280" dominantBaseline="middle">
                  {label}
                </text>
                <rect x={labelW} y={y + 6} width={barW} height={16} rx={3} fill="#f3f4f6" />
                <rect x={labelW} y={y + 6} width={invPx} height={16} rx={3} fill={color} fillOpacity={0.85} />
                {minPx > 0 && (
                  <line
                    x1={labelW + minPx} y1={y + 4}
                    x2={labelW + minPx} y2={y + 24}
                    stroke="#374151" strokeWidth={1.5} strokeDasharray="3,2"
                  />
                )}
                {/* inventory count */}
                <text x={labelW + barW + 6} y={y + 12} fontSize={10} fill="#374151" fontWeight="600" dominantBaseline="middle">
                  {p.INVENTARIO.toLocaleString("es-ES")}
                </text>
                {/* días restantes */}
                <text x={labelW + barW + 6} y={y + 24} fontSize={9} fill={
                  p.diasRestantes === null ? "#9ca3af" :
                  p.diasRestantes < 3  ? "#dc2626" :
                  p.diasRestantes < 7  ? "#ea580c" :
                  p.diasRestantes < 14 ? "#d97706" :
                  "#10b981"
                } dominantBaseline="middle">
                  {dias !== "—" ? `${dias} restantes` : "sin mov."}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="text-[9px] text-gray-400 mt-1">— línea punteada = stock mínimo · días restantes calculado de velocidad de consumo</p>
      </div>
    </div>
  );
}

const ESTADO_FILTERS = [
  { label: "Todos", value: "Todos" },
  { label: "✅ OK", value: "OK" },
  { label: "⚠️ Solicitar", value: "SOLICITAR" },
  { label: "🚨 Sin stock", value: "SIN STOCK" },
];

const URGENCIA_FILTERS = [
  { label: "Todos", value: "Todos" },
  { label: "🔴 Crítico", value: "CRITICO" },
  { label: "🟠 Comprar", value: "COMPRAR" },
  { label: "⚠️ Solicitar", value: "SOLICITAR" },
  { label: "✅ OK", value: "OK" },
];

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"productos" | "movimientos">("productos");
  const [catFilter, setCatFilter] = useState<string>("Todos");
  const [estadoFilter, setEstadoFilter] = useState<string>("Todos");
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>("Todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full text-sm text-red-500">{error}</div>
  );

  if (!data) return null;
  const { kpis, productos, ultimosMovimientos } = data;

  const sorted = [...productos].sort((a, b) => {
    const rank = (u: string) =>
      u === "CRITICO" ? 0 : u === "COMPRAR" ? 1 : u === "SOLICITAR" ? 2 : 3;
    return rank(a.urgencia) - rank(b.urgencia);
  });

  const categories = ["Todos", ...Array.from(new Set(productos.map((p) => p.CATEGORÍA))).sort()];

  const filtered = sorted.filter((p) => {
    const catOk = catFilter === "Todos" || p.CATEGORÍA === catFilter;
    const estOk = estadoFilter === "Todos" || p.ESTADO.includes(estadoFilter);
    const urgOk = urgenciaFilter === "Todos" || p.urgencia === urgenciaFilter;
    return catOk && estOk && urgOk;
  });

  const hasActiveFilters = catFilter !== "Todos" || estadoFilter !== "Todos" || urgenciaFilter !== "Todos";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Inventario Lucius</h2>
        <button onClick={load} className="text-xs text-blue-600 hover:underline">Actualizar</button>
      </div>

      {/* Alert Banner */}
      <div className="pt-3">
        <AlertaBanner productos={sorted} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-7 gap-2 px-5 pb-4 shrink-0">
        {[
          { label: "Productos",    value: kpis.totalProductos,              cls: "text-gray-800" },
          { label: "Valor total",  value: `${fmt(kpis.valorTotal)} CUP`,    cls: "text-gray-800" },
          { label: "✅ OK",        value: kpis.ok,                          cls: "text-emerald-600" },
          { label: "⚠️ Solicitar", value: kpis.solicitar,                   cls: "text-amber-600" },
          { label: "🚨 Sin stock", value: kpis.sinStock,                    cls: "text-red-600" },
          { label: "🔴 Críticos",  value: kpis.criticos,                    cls: kpis.criticos > 0 ? "text-red-700 font-bold" : "text-gray-400" },
          { label: "📅 < 7 días",  value: kpis.comprar7dias,                cls: kpis.comprar7dias > 0 ? "text-orange-600 font-semibold" : "text-gray-400" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 px-2 py-2.5">
            <p className="text-[10px] text-gray-400 mb-1 leading-tight">{k.label}</p>
            <p className={`text-base font-semibold leading-tight ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Stock Chart */}
      <StockChart productos={sorted} />

      {/* Sub-tabs */}
      <div className="flex gap-1 px-5 shrink-0">
        {(["productos", "movimientos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              view === t
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "productos" ? "Productos" : "Últimos movimientos"}
          </button>
        ))}
      </div>

      {/* Filters — only productos tab */}
      {view === "productos" && (
        <div className="px-5 py-2 bg-white border-b border-gray-100 shrink-0 space-y-1.5">
          {/* Category */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-gray-400 font-medium w-14 shrink-0">Categoría</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
                  catFilter === cat
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Estado */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-gray-400 font-medium w-14 shrink-0">Estado</span>
            {ESTADO_FILTERS.map((ef) => (
              <button
                key={ef.value}
                onClick={() => setEstadoFilter(ef.value)}
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
                  estadoFilter === ef.value
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {ef.label}
              </button>
            ))}
          </div>
          {/* Urgencia */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-gray-400 font-medium w-14 shrink-0">Urgencia</span>
            {URGENCIA_FILTERS.map((uf) => (
              <button
                key={uf.value}
                onClick={() => setUrgenciaFilter(uf.value)}
                className={`px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
                  urgenciaFilter === uf.value
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {uf.label}
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">
                {filtered.length} de {productos.length} productos
              </span>
              <button
                onClick={() => { setCatFilter("Todos"); setEstadoFilter("Todos"); setUrgenciaFilter("Todos"); }}
                className="text-[10px] text-blue-500 hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        {view === "productos" ? (
          <table className="w-full text-xs bg-white rounded-b-lg border border-gray-200 border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["Código", "Descripción", "Categoría", "UdM", "Stock mín", "Inventario", "Costo prom", "Valor total", "Vel/día", "Días", "ABC", "Acción"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-6 text-center text-gray-400 text-xs">
                    No hay productos con los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{p.CÓDIGO}</td>
                    <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{p.DESCRIPCIÓN}</td>
                    <td className="px-3 py-2 text-gray-500">{p.CATEGORÍA}</td>
                    <td className="px-3 py-2 text-gray-500">{p.UdM}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{p.STOCK_MÍN}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">{p.INVENTARIO}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{fmt(p.COSTO_UNIT_PROM)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(p.VALOR_TOTAL)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">{fmtVel(p.velocidadDiaria)}</td>
                    <td className={`px-3 py-2 text-right whitespace-nowrap ${diasCls(p.diasRestantes)}`}>
                      {diasLabel(p.diasRestantes)}
                    </td>
                    <td className="px-3 py-2"><AbcBadge abc={p.abc} /></td>
                    <td className="px-3 py-2"><UrgenciaBadge urgencia={p.urgencia} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs bg-white rounded-b-lg border border-gray-200 border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["ID", "Fecha", "Tipo", "Código", "Producto", "Entrada", "Salida", "Precio", "Valor"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ultimosMovimientos.map((m, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-500 text-[10px]">{m.id}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{String(m.fecha).slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tipoColor(String(m.tipo))}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-600">{m.codigo}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[160px] truncate">{m.producto}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">{m.entrada ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-red-500">{m.salida ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{m.precioUnit != null ? fmt(Number(m.precioUnit)) : "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{m.valorTotal != null ? fmt(Number(m.valorTotal)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
