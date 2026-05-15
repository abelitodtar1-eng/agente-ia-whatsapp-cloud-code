import { NextRequest, NextResponse } from "next/server";
import { getPaymentsByConversation } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return NextResponse.json(getPaymentsByConversation(Number(conversationId)));
}
