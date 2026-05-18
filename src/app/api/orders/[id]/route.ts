import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus, deleteOrder, OrderStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params;
  try {
    const { status, payment_id } = await req.json();
    const valid: OrderStatus[] = ["draft", "confirmed", "paid", "shipped", "cancelled"];
    if (!valid.includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    updateOrderStatus(Number(id), status, payment_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Context) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (order.status !== "draft") return NextResponse.json({ error: "Solo se pueden eliminar pedidos en borrador" }, { status: 400 });
  deleteOrder(Number(id));
  return NextResponse.json({ ok: true });
}
