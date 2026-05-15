import { NextRequest, NextResponse } from "next/server";
import { getEnzonaConfig, getConversationById, createPaymentRecord, enqueueOutbox } from "@/lib/db";
import { createEnzonaPayment } from "@/lib/enzona";

export async function POST(req: NextRequest) {
  const { conversationId, amount, description } = await req.json() as {
    conversationId?: number;
    amount?: number;
    description?: string;
  };

  if (!conversationId || !amount || amount <= 0 || !description?.trim()) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const conversation = getConversationById(conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const cfg = getEnzonaConfig();
  if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.merchantUuid) {
    return NextResponse.json({ error: "Credenciales Enzona no configuradas. Ve a Configuración → Enzona." }, { status: 503 });
  }

  const merchantOpId = `dtar-${conversationId}-${Date.now()}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://dtar-agente.oj16f5.easypanel.host";

  try {
    const result = await createEnzonaPayment({
      consumerKey: cfg.consumerKey,
      consumerSecret: cfg.consumerSecret,
      merchantUuid: cfg.merchantUuid,
      merchantOpId,
      amount,
      description: description.trim(),
      buyerPhone: conversation.phone,
      returnUrl: `${baseUrl}/api/payments/webhook?status=completed&uuid=${merchantOpId}`,
      cancelUrl: `${baseUrl}/api/payments/webhook?status=cancelled&uuid=${merchantOpId}`,
    });

    const payment = createPaymentRecord({
      conversationId,
      transactionUuid: result.transactionUuid,
      merchantOpId,
      amount,
      description: description.trim(),
      linkConfirm: result.linkConfirm,
    });

    // Send link via WhatsApp
    const waText = `💳 *Pago pendiente*\n${description.trim()}\n*Monto:* ${amount.toFixed(2)} CUP\n\nConfirma tu pago en Enzona:\n${result.linkConfirm}`;
    enqueueOutbox(conversationId, conversation.phone, waText);

    return NextResponse.json(payment, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
