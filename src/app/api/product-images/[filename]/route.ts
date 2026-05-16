import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const IMAGES_DIR = path.resolve(process.cwd(), "data", "images");
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  // Only allow safe filenames
  if (!/^[\w\-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const filepath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const mime = MIME[ext] ?? "image/jpeg";
  const buffer = fs.readFileSync(filepath);
  return new NextResponse(buffer, { headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400" } });
}
