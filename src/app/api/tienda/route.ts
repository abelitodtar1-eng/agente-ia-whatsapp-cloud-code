import { NextResponse } from "next/server";
import { getGoogleSheetIdTienda, getConnectionState, getImagesByNombre, listActiveProducts } from "@/lib/db";

interface GvizCell { v: string | number | null; f?: string }
interface GvizRow  { c: (GvizCell | null)[] }
interface GvizTable { cols: { label: string }[]; rows: GvizRow[] }
interface GvizResponse { table: GvizTable }

async function fetchSheet(sheetId: string, sheet: string): Promise<Record<string, string | number | null>[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}`;
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

function detectSchema(cols: string[]): "inventario" | "tienda" {
  if (cols.includes("DESCRIPCIÓN") || cols.includes("INVENTARIO")) return "inventario";
  if (cols.includes("Producto") || cols.includes("Precio USD")) return "tienda";
  return "tienda";
}

export async function GET() {
  try {
    const sheetId = getGoogleSheetIdTienda();
    if (!sheetId) {
      // fallback: SQLite local
      const conn = getConnectionState();
      const productos = listActiveProducts().map(p => ({
        id: p.id, nombre: p.nombre, categoria: p.categoria,
        udm: p.udm, stock: p.stock, precio: p.precio,
        estado: p.stock > 0 ? "OK" : "SIN STOCK", imagen: p.imagen ?? null,
        valoracion: null, tamano: null,
      }));
      return NextResponse.json({ productos, phone: conn.phone ?? "" });
    }

    const [rows, images] = await Promise.all([
      fetchSheet(sheetId, "PRODUCTOS"),
      Promise.resolve(getImagesByNombre()),
    ]);

    const cols = Object.keys(rows[0] ?? {});
    const schema = detectSchema(cols);

    const productos = rows
      .filter(r => {
        if (schema === "inventario") return Number(r["INVENTARIO"]) > 0;
        return true; // catálogo: todos visibles
      })
      .map((r, idx) => {
        if (schema === "inventario") {
          const nombre = String(r["DESCRIPCIÓN"] ?? "").trim();
          return {
            id: Number(r["CÓDIGO"]) || idx,
            nombre,
            categoria: String(r["CATEGORÍA"] ?? ""),
            udm: String(r["UdM"] ?? ""),
            stock: Number(r["INVENTARIO"]) || 0,
            precio: Number(r["COSTO_UNIT_PROM"]) || 0,
            estado: Number(r["INVENTARIO"]) > 0 ? "OK" : "SIN STOCK",
            imagen: images.get(nombre.toLowerCase()) ?? null,
            valoracion: null, tamano: null,
          };
        }
        // schema === "tienda" — catálogo Lucy
        const nombre = String(r["Producto"] ?? "").trim();
        return {
          id: idx + 1,
          nombre,
          categoria: String(r["Categoría"] ?? r["Categoria"] ?? ""),
          udm: String(r["Tamaño"] ?? r["Tamano"] ?? ""),
          stock: 1,
          precio: Number(r["Precio USD"] ?? r["Precio"] ?? 0),
          estado: "OK",
          imagen: images.get(nombre.toLowerCase()) ?? null,
          valoracion: String(r["Valoración"] ?? r["Valoracion"] ?? ""),
          tamano: String(r["Tamaño"] ?? r["Tamano"] ?? ""),
        };
      });

    const conn = getConnectionState();
    return NextResponse.json({ productos, phone: conn.phone ?? "" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
