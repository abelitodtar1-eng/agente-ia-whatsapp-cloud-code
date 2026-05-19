import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { listCatalogo, createCatalogoItem } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATALOGO_DIR = path.resolve(process.cwd(), "data", "catalogo");

function ensureDir() {
  if (!fs.existsSync(CATALOGO_DIR)) fs.mkdirSync(CATALOGO_DIR, { recursive: true });
}

export function GET() {
  return NextResponse.json(listCatalogo());
}

export async function POST(req: NextRequest) {
  ensureDir();
  const form = await req.formData();
  const title = (form.get("title") as string | null)?.trim();
  const description = (form.get("description") as string | null)?.trim() || null;
  const file = form.get("imagen") as File | null;

  if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Formato no soportado (jpg/png/webp)" }, { status: 400 });
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filepath = path.join(CATALOGO_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  const item = createCatalogoItem(title, description, filename);
  return NextResponse.json(item, { status: 201 });
}
