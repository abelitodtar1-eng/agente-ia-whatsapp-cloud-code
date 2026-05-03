import { NextRequest, NextResponse } from "next/server";
import { setMode } from "@/lib/db";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json();
  const mode = body?.mode;
  if (mode !== "AI" && mode !== "HUMAN") {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }

  setMode(id, mode);
  return NextResponse.json({ ok: true });
}
