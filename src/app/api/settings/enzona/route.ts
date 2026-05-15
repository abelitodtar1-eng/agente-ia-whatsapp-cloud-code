import { NextRequest, NextResponse } from "next/server";
import { getEnzonaConfig, setEnzonaConfig } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getEnzonaConfig());
}

export async function POST(req: NextRequest) {
  const { consumerKey, consumerSecret, merchantUuid } = await req.json() as {
    consumerKey?: string; consumerSecret?: string; merchantUuid?: string;
  };
  if (!consumerKey?.trim() || !consumerSecret?.trim() || !merchantUuid?.trim()) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }
  setEnzonaConfig(consumerKey.trim(), consumerSecret.trim(), merchantUuid.trim());
  return NextResponse.json({ ok: true });
}
