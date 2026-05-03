import { NextRequest, NextResponse } from "next/server";
import { getMessages, insertMessage, enqueueOutbox, getConversationById } from "@/lib/db";

interface Ctx {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }
  const messages = getMessages(id);
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { conversationId } = await params;
  const id = parseInt(conversationId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const body = await req.json();
  const content: string = body?.content ?? "";
  if (!content.trim()) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  const conversation = getConversationById(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  insertMessage(id, "human", content.trim());
  enqueueOutbox(id, conversation.phone, content.trim());

  return NextResponse.json({ ok: true });
}
