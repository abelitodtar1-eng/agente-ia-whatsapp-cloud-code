import { NextRequest, NextResponse } from "next/server";
import { getWebhookUrl } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { message, sessionId } = await req.json() as { message?: string; sessionId?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL ?? getWebhookUrl();
  if (!webhookUrl) {
    return NextResponse.json({ error: "Webhook no configurado. Configúralo en la pestaña Webhook." }, { status: 503 });
  }

  const phone = `webchat_${sessionId ?? "default"}@web`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message: message.trim() }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return NextResponse.json({ error: `Webhook respondió ${resp.status}: ${body.slice(0, 100)}` }, { status: 502 });
    }

    const data = await resp.json() as { response?: string };
    return NextResponse.json({ response: data.response ?? "Sin respuesta del bot." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
