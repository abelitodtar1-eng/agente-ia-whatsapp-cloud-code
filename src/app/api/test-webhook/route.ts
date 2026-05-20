import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url?: string };
  if (!url?.startsWith("http")) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "test@s.whatsapp.net", message: "ping" }),
      signal: AbortSignal.timeout(90_000),
    });
    const text = await res.text();
    let preview = "(sin body)";
    if (text.trim()) {
      try { preview = JSON.stringify(JSON.parse(text)).slice(0, 120); }
      catch { preview = text.slice(0, 120); }
    }
    return NextResponse.json({ ok: res.ok, status: res.status, preview });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    const detail = e instanceof Error ? e.message : String(e);
    const isTimeout = name === "TimeoutError" || /timed?\s*out/i.test(detail);
    return NextResponse.json({
      ok: false,
      error: isTimeout
        ? "Sin respuesta en 90s — el workflow puede estar corriendo, verifica n8n"
        : `Sin respuesta: ${detail}`,
    }, { status: 502 });
  }
}
