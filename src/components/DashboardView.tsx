"use client";
import { useState, useEffect, useCallback } from "react";

interface Kpis {
  totalProductos: number;
  valorTotal: number;
  sinStock: number;
  solicitar: number;
  ok: number;
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

function estadoColor(estado: string) {
  if (estado.includes("SIN STOCK")) return "text-red-600 font-semibold";
  if (estado.includes("SOLICITAR")) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function tipoColor(tipo: string) {
  if (tipo === "ENTRADA") return "bg-emerald-100 text-emerald-700";
  if (tipo === "SALIDA")  return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"productos" | "movimientos">("productos");

  const load = useCallback(async () => {
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
    const rank = (e: string) => e.includes("SIN STOCK") ? 0 : e.includes("SOLICITAR") ? 1 : 2;
    return rank(a.ESTADO) - rank(b.ESTADO);
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Inventario Lucius</h2>
        <button onClick={load} className="text-xs text-blue-600 hover:underline">Actualizar</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3 px-5 py-4 shrink-0">
        {[
          { label: "Productos", value: kpis.totalProductos, cls: "text-gray-800" },
          { label: "Valor total", value: `${fmt(kpis.valorTotal)} CUP`, cls: "text-gray-800" },
          { label: "✅ OK", value: kpis.ok, cls: "text-emerald-600" },
          { label: "⚠️ Solicitar", value: kpis.solicitar, cls: "text-amber-600" },
          { label: "🚨 Sin stock", value: kpis.sinStock, cls: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 px-3 py-3">
            <p className="text-xs text-gray-400 mb-1">{k.label}</p>
            <p className={`text-lg font-semibold ${k.cls}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-5 shrink-0">
        {(["productos", "movimientos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
              view === t ? "border-blue-600 text-blue-600 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "productos" ? "Productos" : "Últimos movimientos"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-5 pb-4">
        {view === "productos" ? (
          <table className="w-full text-xs bg-white rounded-b-lg border border-gray-200 border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["Código","Descripción","Categoría","UdM","Stock mín","Inventario","Costo prom","Valor total","Estado"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">{p.CÓDIGO}</td>
                  <td className="px-3 py-2 text-gray-800 max-w-[180px] truncate">{p.DESCRIPCIÓN}</td>
                  <td className="px-3 py-2 text-gray-500">{p.CATEGORÍA}</td>
                  <td className="px-3 py-2 text-gray-500">{p.UdM}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{p.STOCK_MÍN}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800">{p.INVENTARIO}</td>
                  <td className="px-3 py-2 text-right text-gray-500">{fmt(p.COSTO_UNIT_PROM)}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{fmt(p.VALOR_TOTAL)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${estadoColor(p.ESTADO)}`}>{p.ESTADO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs bg-white rounded-b-lg border border-gray-200 border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {["ID","Fecha","Tipo","Código","Producto","Entrada","Salida","Precio","Valor"].map((h) => (
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
