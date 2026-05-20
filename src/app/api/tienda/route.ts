import { NextResponse } from "next/server";
import { getGoogleSheetId, getConnectionState, getImagesByNombre } from "@/lib/db";

interface GvizCell { v: string | number | null; f?: string }
interface GvizRow  { c: (GvizCell | null)[] }
interface GvizTable { cols: { label: string }[]; rows: GvizRow[] }
interface GvizResponse { table: GvizTable }

async function fetchSheet(sheet: string): Promise<Record<string, string | number | null>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${getGoogleSheetId()}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  const raw = await res.text();
  const jsonStr = raw
    .replace(/^\/\*.*?\*\/\s*google\.visualization\.Query\.setResponse\(/, "")
    .replace(/\);?\s*$/, "");
  const data: GvizResponse = JSON.parse(jsonStr);
  const cols = data.table.cols.map(c => c.label);
  return (data.table.rows ?? []).map(row => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col, i) => { obj[col] = row.c?.[i]?.v ?? null; });
    return obj;
  });
}

export async function GET() {
  try {
    const [rows, images] = await Promise.all([
      fetchSheet("PRODUCTOS"),
      Promise.resolve(getImagesByNombre()),
    ]);

    const productos = rows
      .filter(r => Number(r["INVENTARIO"]) > 0)
      .map(r => {
        const nombre = String(r["DESCRIPCIÓN"] ?? "").trim();
        return {
          id:       Number(r["CÓDIGO"]) || 0,
          nombre,
          categoria: String(r["CATEGORÍA"] ?? ""),
          udm:       String(r["UdM"] ?? ""),
          stock:     Number(r["INVENTARIO"]) || 0,
          precio:    Number(r["COSTO_UNIT_PROM"]) || 0,
          estado:    Number(r["INVENTARIO"]) > 0 ? "OK" : "SIN STOCK",
          imagen:    images.get(nombre.toLowerCase()) ?? null,
        };
      });

    const conn  = getConnectionState();
    const phone = conn.phone ?? "";
    return NextResponse.json({ productos, phone });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
