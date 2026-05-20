import { NextRequest, NextResponse } from "next/server";
import {
  getWebhookUrl, setWebhookUrl,
  getInventarioWebhookUrl, setInventarioWebhookUrl,
  getContabilidadWebhookUrl, setContabilidadWebhookUrl,
  getVendedoraWebhookUrl, setVendedoraWebhookUrl,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    url: getWebhookUrl(),
    inventario: getInventarioWebhookUrl(),
    contabilidad: getContabilidadWebhookUrl(),
    vendedora: getVendedoraWebhookUrl(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { url?: string; inventario?: string; contabilidad?: string; vendedora?: string };

  const updates: { field: string; url: string; setter: (u: string) => void }[] = [];

  if (body.inventario !== undefined) {
    const url = body.inventario.trim();
    if (url) { try { new URL(url); } catch { return NextResponse.json({ error: "URL inventario inválida" }, { status: 400 }); } }
    updates.push({ field: "inventario", url, setter: setInventarioWebhookUrl });
  }

  if (body.contabilidad !== undefined) {
    const url = body.contabilidad.trim();
    if (url) { try { new URL(url); } catch { return NextResponse.json({ error: "URL contabilidad inválida" }, { status: 400 }); } }
    updates.push({ field: "contabilidad", url, setter: setContabilidadWebhookUrl });
  }

  if (body.vendedora !== undefined) {
    const url = body.vendedora.trim();
    if (url) { try { new URL(url); } catch { return NextResponse.json({ error: "URL vendedora inválida" }, { status: 400 }); } }
    updates.push({ field: "vendedora", url, setter: setVendedoraWebhookUrl });
  }

  if (body.url !== undefined) {
    const url = body.url.trim();
    if (!url) return NextResponse.json({ error: "URL requerida" }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: "URL inválida" }, { status: 400 }); }
    updates.push({ field: "url", url, setter: setWebhookUrl });
  }

  if (updates.length === 0) return NextResponse.json({ error: "Sin campos para guardar" }, { status: 400 });

  for (const { url, setter } of updates) setter(url);

  return NextResponse.json({ ok: true });
}
