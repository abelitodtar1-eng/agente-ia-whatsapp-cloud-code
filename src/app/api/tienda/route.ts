import { NextResponse } from "next/server";
import { listActiveProducts, getConnectionState } from "@/lib/db";

export async function GET() {
  try {
    const productos = listActiveProducts().map(p => ({
      id:        p.id,
      nombre:    p.nombre,
      categoria: p.categoria,
      udm:       p.udm,
      stock:     p.stock,
      precio:    p.precio,
      estado:    p.stock > 0 ? "OK" : "SIN STOCK",
    }));
    const conn  = getConnectionState();
    const phone = conn.phone ?? "";
    return NextResponse.json({ productos, phone });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
