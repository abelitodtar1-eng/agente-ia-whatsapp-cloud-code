import { NextRequest, NextResponse } from "next/server";
import { getStatusHistory } from "@/lib/db";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = getStatusHistory(200);
  const item = items.find(i => i.id === Number(id));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filepath = item.image_path;
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const buf = fs.readFileSync(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return new NextResponse(buf, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=3600" } });
}
