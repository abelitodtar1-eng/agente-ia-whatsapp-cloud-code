import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getCatalogoItem, deleteCatalogoItem } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATALOGO_DIR = path.resolve(process.cwd(), "data", "catalogo");

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = getCatalogoItem(Number(id));
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const filepath = path.join(CATALOGO_DIR, item.filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  deleteCatalogoItem(item.id);

  return NextResponse.json({ ok: true });
}
