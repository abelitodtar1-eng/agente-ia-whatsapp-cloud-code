import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EVO_URL = process.env.EVOLUTION_API_URL ?? "https://artemisa-evolution-api.oj16f5.easypanel.host";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "429683C4C977415CAAFCCE10F7D57E11";

export async function GET(req: NextRequest) {
  const instance = new URL(req.url).searchParams.get("instance");

  if (!instance) {
    // Return all instances with their webhook config
    const res = await fetch(`${EVO_URL}/instance/fetchInstances`, {
      headers: { apikey: EVO_KEY },
    });
    if (!res.ok) return NextResponse.json({ error: "No se pudo conectar a Evolution API" }, { status: 502 });
    const data = await res.json() as Array<{ id: string; name: string; connectionStatus: string; profileName: string }>;
    return NextResponse.json(data.map(i => ({
      id: i.id,
      name: i.name,
      status: i.connectionStatus,
      profile: i.profileName,
    })));
  }

  const res = await fetch(`${EVO_URL}/webhook/find/${instance}`, {
    headers: { apikey: EVO_KEY },
  });
  if (!res.ok) return NextResponse.json({ error: `Error ${res.status}` }, { status: res.status });
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { instance: string; url: string; enabled: boolean; events: string[] };
  const { instance, url, enabled, events } = body;

  if (!instance) return NextResponse.json({ error: "instance requerido" }, { status: 400 });
  if (url) { try { new URL(url); } catch { return NextResponse.json({ error: "URL inválida" }, { status: 400 }); } }

  const res = await fetch(`${EVO_URL}/webhook/set/${instance}`, {
    method: "POST",
    headers: { apikey: EVO_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      webhook: { url, enabled, byEvents: false, base64: false, events },
    }),
  });
  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
  return NextResponse.json({ ok: true, data });
}
