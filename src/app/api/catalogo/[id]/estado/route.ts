import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getCatalogoItem } from "@/lib/db";
import { sendWAStatus } from "@/lib/baileys/client";

export const dynamic = "force-dynamic";

const CATALOGO_DIR = path.resolve(process.cwd(), "data", "catalogo");

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getCatalogoItem(Number(id));
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const filepath = path.join(CATALOGO_DIR, item.filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const buffer = fs.readFileSync(filepath);
  const caption = item.description ? `${item.title}\n\n${item.description}` : item.title;

  try {
    await sendWAStatus(buffer, caption);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
