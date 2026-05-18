import { NextRequest, NextResponse } from "next/server";
import { getTagsByConversation, addTag, removeTag } from "@/lib/db";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  return NextResponse.json(getTagsByConversation(id));
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const { tag } = await req.json() as { tag: string };
  if (!tag?.trim()) return NextResponse.json({ error: "Tag requerido" }, { status: 400 });
  addTag(id, tag);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const { tag } = await req.json() as { tag: string };
  if (!tag?.trim()) return NextResponse.json({ error: "Tag requerido" }, { status: 400 });
  removeTag(id, tag);
  return NextResponse.json({ ok: true });
}
