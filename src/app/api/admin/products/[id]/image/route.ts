import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { updateProduct } from "@/lib/db";

const IMAGES_DIR = path.resolve(process.cwd(), "data", "images");
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!productId) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "sin archivo" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "tipo no permitido" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "máximo 5MB" }, { status: 400 });

  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const ext = EXT[file.type] ?? "jpg";
  const filename = `product-${productId}.${ext}`;
  const filepath = path.join(IMAGES_DIR, filename);

  // Remove old images for this product (different extension)
  for (const f of fs.readdirSync(IMAGES_DIR)) {
    if (f.startsWith(`product-${productId}.`) && f !== filename) {
      fs.unlinkSync(path.join(IMAGES_DIR, f));
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);

  updateProduct(productId, { imagen: filename });
  return NextResponse.json({ filename });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!fs.existsSync(IMAGES_DIR)) return NextResponse.json({ ok: true });
  for (const f of fs.readdirSync(IMAGES_DIR)) {
    if (f.startsWith(`product-${productId}.`)) {
      fs.unlinkSync(path.join(IMAGES_DIR, f));
    }
  }
  updateProduct(productId, { imagen: null });
  return NextResponse.json({ ok: true });
}
