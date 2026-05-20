import { NextResponse } from "next/server";
import { upsertProductByName, getGoogleSheetId } from "@/lib/db";

async function fetchSheet(sheet: string): Promise<Record<string, string | number | null>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${getGoogleSheetId()}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url, { cache: "no-store" });
  const raw = await res.text();
  const jsonStr = raw
    .replace(/^\/\*.*?\*\/\s*google\.visualization\.Query\.setResponse\(/, "")
    .replace(/\);?\s*$/, "");
  const data = JSON.parse(jsonStr);
  const cols = data.table.cols.map((c: { label: string }) => c.label);
  return (data.table.rows ?? []).map((row: { c: ({ v: string | number | null } | null)[] }) => {
    const obj: Record<string, string | number | null> = {};
    cols.forEach((col: string, i: number) => { obj[col] = row.c?.[i]?.v ?? null; });
    return obj;
  });
}

export async function POST() {
  try {
    const rows = await fetchSheet("PRODUCTOS");
    let synced = 0;
    for (const r of rows) {
      const nombre = String(r["DESCRIPCIÓN"] ?? "").trim();
      if (!nombre) continue;
      upsertProductByName({
        nombre,
        categoria: String(r["CATEGORÍA"] ?? ""),
        udm:       String(r["UdM"] ?? ""),
        stock:     Number(r["INVENTARIO"]) || 0,
        precio:    Number(r["COSTO_UNIT_PROM"]) || 0,
      });
      synced++;
    }
    return NextResponse.json({ synced });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
