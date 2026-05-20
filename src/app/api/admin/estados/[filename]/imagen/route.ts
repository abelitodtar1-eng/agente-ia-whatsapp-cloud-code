import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const ESTADOS_DIR = process.env.ESTADOS_DIR ?? path.resolve(process.cwd(), "estados");

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = path.basename(filename);
  const ext = path.extname(safe).toLowerCase();
  if (!MIME[ext]) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
  const filepath = path.join(ESTADOS_DIR, safe);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  const mime = MIME[ext];
  const buf = fs.readFileSync(filepath);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
