import { NextResponse } from "next/server";
import { getGoogleSheetId } from "@/lib/db";

interface GvizCell { v: string | number | null; f?: string }
interface GvizRow  { c: (GvizCell | null)[] }
interface GvizCol  { label: string }
interface GvizTable { cols: GvizCol[]; rows: GvizRow[] }
interface GvizResponse { table: GvizTable }

async function fetchSheet(sheet: string): Promise<Record<string, string | number | null>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${getGoogleSheetId()}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  const raw = await res.text();
  const jsonStr = raw.replace(/^\/\*.*?\*\/\s*google\.visualization\.Query\.setResponse\(/, "").replace(/\);?\s*$/, "");
  const data: GvizResponse = JSON.parse(jsonStr);
  const cols = data.table.cols.map((c) => c.label);
  return (data.table.rows ?? []).map((row) => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col, i) => {
      obj[col] = row.c?.[i]?.v ?? null;
    });
    return obj;
  });
}

// gviz serializes dates as "Date(yyyy,mm,dd)" with 0-indexed month
function parseFecha(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw);
  const m = s.match(/^Date\((\d+),(\d+),(\d+)\)/);
  if (m) return new Date(Number(m[1]), Number(m[2]), Number(m[3])).getTime();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
  const t = Date.parse(s);
  return isNaN(t) ? null : t;
}

export async function GET() {
  try {
    const [productos, registro] = await Promise.all([
      fetchSheet("PRODUCTOS"),
      fetchSheet("REGISTRO"),
    ]);

    // --- Velocity map: salidas acumuladas + rango de fechas por producto ---
    type VelData = { salidas: number; firstMs: number; lastMs: number };
    const velMap = new Map<number, VelData>();

    for (const r of registro) {
      const codigo = Number(r["CÓDIGO"]);
      const salida = Number(r["SALIDA"]) || 0;
      const ms = parseFecha(r["FECHA"] as string | number | null);
      if (!codigo || ms === null) continue;

      const existing = velMap.get(codigo);
      if (existing) {
        existing.salidas += salida;
        if (ms < existing.firstMs) existing.firstMs = ms;
        if (ms > existing.lastMs) existing.lastMs = ms;
      } else {
        velMap.set(codigo, { salidas: salida, firstMs: ms, lastMs: ms });
      }
    }

    // --- ABC classification: acumulado de VALOR_TOTAL desc ---
    const totalValorABC = productos.reduce((s, p) => s + (Number(p["VALOR_TOTAL"]) || 0), 0);
    const sortedByValor = [...productos].sort(
      (a, b) => (Number(b["VALOR_TOTAL"]) || 0) - (Number(a["VALOR_TOTAL"]) || 0)
    );
    const abcMap = new Map<number, "A" | "B" | "C">();
    let cumulative = 0;
    for (const p of sortedByValor) {
      const codigo = Number(p["CÓDIGO"]);
      cumulative += Number(p["VALOR_TOTAL"]) || 0;
      const pct = totalValorABC > 0 ? cumulative / totalValorABC : 1;
      abcMap.set(codigo, pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C");
    }

    // --- Enrich products with predictive fields ---
    const enrichedProductos = productos.map((p) => {
      const codigo = Number(p["CÓDIGO"]);
      const inventario = Number(p["INVENTARIO"]) || 0;
      const estado = String(p["ESTADO"] ?? "");

      const vel = velMap.get(codigo);
      let velocidadDiaria = 0;
      let diasRestantes: number | null = null;

      if (vel && vel.salidas > 0) {
        const spanMs = Math.max(vel.lastMs - vel.firstMs, 0);
        const spanDias = Math.max(spanMs / 86_400_000, 1);
        velocidadDiaria = vel.salidas / spanDias;
        diasRestantes = inventario > 0 ? Math.round(inventario / velocidadDiaria) : 0;
      } else if (inventario === 0) {
        diasRestantes = 0;
      }

      const abc = abcMap.get(codigo) ?? "C";

      let urgencia: "CRITICO" | "COMPRAR" | "SOLICITAR" | "OK";
      if (inventario === 0 || (diasRestantes !== null && diasRestantes < 3)) {
        urgencia = "CRITICO";
      } else if (diasRestantes !== null && diasRestantes < 7) {
        urgencia = "COMPRAR";
      } else if ((diasRestantes !== null && diasRestantes < 14) || estado.includes("SOLICITAR") || estado.includes("SIN STOCK")) {
        urgencia = "SOLICITAR";
      } else {
        urgencia = "OK";
      }

      return { ...p, velocidadDiaria, diasRestantes, abc, urgencia };
    });

    // --- KPIs ---
    const totalProductos = productos.length;
    const valorTotal     = productos.reduce((s, p) => s + (Number(p["VALOR_TOTAL"]) || 0), 0);
    const sinStock       = productos.filter((p) => String(p["ESTADO"]).includes("SIN STOCK")).length;
    const solicitar      = productos.filter((p) => String(p["ESTADO"]).includes("SOLICITAR")).length;
    const ok             = productos.filter((p) => String(p["ESTADO"]).includes("OK")).length;
    const criticos       = enrichedProductos.filter((p) => p.urgencia === "CRITICO").length;
    const comprar7dias   = enrichedProductos.filter((p) => p.urgencia === "COMPRAR").length;

    // --- Last 10 movements for display ---
    const ultimosMovimientos = registro
      .slice(-10)
      .reverse()
      .map((r) => ({
        id:         r["ID"],
        fecha:      r["FECHA"],
        tipo:       r["TIPO"],
        codigo:     r["CÓDIGO"],
        producto:   r["PRODUCTO"],
        entrada:    r["ENTRADA"],
        salida:     r["SALIDA"],
        precioUnit: r["PRECIO_UNIT"],
        valorTotal: r["VALOR_TOTAL"],
      }));

    return NextResponse.json({
      kpis: { totalProductos, valorTotal, sinStock, solicitar, ok, criticos, comprar7dias },
      productos: enrichedProductos,
      ultimosMovimientos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
