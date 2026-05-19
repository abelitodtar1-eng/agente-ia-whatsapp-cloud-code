import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getProduct, enqueueStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

const IMAGES_DIR = path.resolve(process.cwd(), "data", "images");

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(Number(id));
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  if (!product.imagen) return NextResponse.json({ error: "Producto sin imagen" }, { status: 400 });

  const filepath = path.join(IMAGES_DIR, product.imagen);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Archivo de imagen no encontrado" }, { status: 404 });

  const lines = [product.nombre, `💰 ${product.precio.toLocaleString("es-CU")} CUP`, `📦 Stock: ${product.stock}`];
  if (product.categoria) lines.push(`🏷️ ${product.categoria}`);
  enqueueStatus(filepath, lines.join("\n"));
  return NextResponse.json({ ok: true });
}
