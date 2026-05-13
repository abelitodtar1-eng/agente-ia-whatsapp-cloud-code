import { NextRequest, NextResponse } from "next/server";
import { getWebhookUrl, setWebhookUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const url = getWebhookUrl();
  return NextResponse.json({ url });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { url?: string };
  const url = body?.url?.trim() ?? "";
  if (!url) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  setWebhookUrl(url);
  return NextResponse.json({ ok: true });
}
