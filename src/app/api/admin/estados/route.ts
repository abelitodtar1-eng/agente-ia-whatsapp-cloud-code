import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const ESTADOS_DIR = process.env.ESTADOS_DIR ?? path.resolve(process.cwd(), "estados");
const VALID_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export interface EstadosFile {
  filename: string;
  size: number;
  mtime: number;
}

export function GET() {
  if (!fs.existsSync(ESTADOS_DIR)) {
    return NextResponse.json(
      { files: [], error: "Directorio de estados no montado. Monta el volumen /app/estados en Easypanel." },
      { status: 200 }
    );
  }

  const entries = fs.readdirSync(ESTADOS_DIR, { withFileTypes: true });
  const files: EstadosFile[] = entries
    .filter(e => e.isFile() && VALID_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => {
      const stat = fs.statSync(path.join(ESTADOS_DIR, e.name));
      return { filename: e.name, size: stat.size, mtime: Math.floor(stat.mtimeMs / 1000) };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));

  return NextResponse.json({ files });
}
