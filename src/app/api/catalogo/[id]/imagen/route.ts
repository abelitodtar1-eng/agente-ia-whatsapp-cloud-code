import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getCatalogoItem } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATALOGO_DIR = path.resolve(process.cwd(), "data", "catalogo");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getCatalogoItem(Number(id));
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const filepath = path.join(CATALOGO_DIR, item.filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const ext = item.filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  const buffer = fs.readFileSync(filepath);
  return new NextResponse(buffer, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" } });
}
