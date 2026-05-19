import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getCatalogoItem, enqueueStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATALOGO_DIR = path.resolve(process.cwd(), "data", "catalogo");

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getCatalogoItem(Number(id));
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const filepath = path.join(CATALOGO_DIR, item.filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const caption = item.description ? `${item.title}\n\n${item.description}` : item.title;
  enqueueStatus(filepath, caption);
  return NextResponse.json({ ok: true });
}
