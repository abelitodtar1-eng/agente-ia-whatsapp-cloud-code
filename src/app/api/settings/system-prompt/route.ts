import { NextRequest, NextResponse } from "next/server";
import { getSystemPrompt, setSystemPrompt } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const { text, updatedAt } = getSystemPrompt();
  return NextResponse.json({ text, updatedAt });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const text: string = body?.text ?? "";
  if (!text.trim()) {
    return NextResponse.json(
      { error: "El system prompt no puede estar vacío." },
      { status: 400 }
    );
  }
  if (text.length > 8000) {
    return NextResponse.json(
      { error: "El system prompt no puede superar 8.000 caracteres." },
      { status: 400 }
    );
  }
  setSystemPrompt(text.trim());
  return NextResponse.json({ ok: true });
}
