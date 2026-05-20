import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { enqueueStatus, getPendingStatus } from "@/lib/db";
import { validateEstadosAuth } from "@/lib/estados-auth";

export const dynamic = "force-dynamic";

const ESTADOS_DIR = process.env.ESTADOS_DIR ?? path.resolve(process.cwd(), "estados");
const VALID_EXTENSIONS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export async function POST(req: NextRequest) {
  if (!validateEstadosAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!fs.existsSync(ESTADOS_DIR)) {
    return NextResponse.json(
      { error: "Directorio de estados no encontrado. Monta el volumen /app/estados en Easypanel." },
      { status: 500 }
    );
  }

  // Parse body — filename es opcional; sin body = publica todo
  let targetFilename: string | null = null;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const body = await req.json() as { filename?: string };
      targetFilename = body.filename?.trim() ?? null;
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
  }

  // Leer archivos disponibles
  const entries = fs.readdirSync(ESTADOS_DIR, { withFileTypes: true });
  let candidates = entries
    .filter(e => e.isFile() && VALID_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name);

  if (targetFilename) {
    const safe = path.basename(targetFilename);
    if (!candidates.includes(safe)) {
      return NextResponse.json({ error: `Archivo no encontrado: ${safe}` }, { status: 404 });
    }
    candidates = [safe];
  }

  // Obtener paths ya pendientes en status_queue para evitar duplicados
  const pending = getPendingStatus();
  const pendingPaths = new Set(pending.map(i => i.image_path));

  const queued: string[] = [];
  const skipped: string[] = [];

  for (const filename of candidates) {
    const absolutePath = path.join(ESTADOS_DIR, filename);
    if (pendingPaths.has(absolutePath)) {
      skipped.push(filename);
      continue;
    }
    enqueueStatus(absolutePath, "");
    queued.push(filename);
  }

  return NextResponse.json({ queued: queued.length, skipped: skipped.length, filenames: queued });
}
