import { NextResponse } from "next/server";

const SHEET_ID = "1srqMvqVqqF4Hblk611Rrdl_IS1mFQvS1UMkFo2yiv7M";

interface GvizCell { v: string | number | null; f?: string }
interface GvizRow  { c: (GvizCell | null)[] }
interface GvizCol  { label: string }
interface GvizTable { cols: GvizCol[]; rows: GvizRow[] }
interface GvizResponse { table: GvizTable }

async function fetchSheet(sheet: string): Promise<Record<string, string | number | null>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
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

export async function GET() {
  try {
    const [productos, registro] = await Promise.all([
      fetchSheet("PRODUCTOS"),
      fetchSheet("REGISTRO"),
    ]);

    const totalProductos = productos.length;
    const valorTotal = productos.reduce((s, p) => s + (Number(p["VALOR_TOTAL"]) || 0), 0);
    const sinStock   = productos.filter((p) => String(p["ESTADO"]).includes("SIN STOCK")).length;
    const solicitar  = productos.filter((p) => String(p["ESTADO"]).includes("SOLICITAR")).length;
    const ok         = productos.filter((p) => String(p["ESTADO"]).includes("OK")).length;

    const ultimosMovimientos = registro
      .slice(-10)
      .reverse()
      .map((r) => ({
        id:          r["ID"],
        fecha:       r["FECHA"],
        tipo:        r["TIPO"],
        codigo:      r["CÓDIGO"],
        producto:    r["PRODUCTO"],
        entrada:     r["ENTRADA"],
        salida:      r["SALIDA"],
        precioUnit:  r["PRECIO_UNIT"],
        valorTotal:  r["VALOR_TOTAL"],
      }));

    return NextResponse.json({
      kpis: { totalProductos, valorTotal, sinStock, solicitar, ok },
      productos,
      ultimosMovimientos,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
