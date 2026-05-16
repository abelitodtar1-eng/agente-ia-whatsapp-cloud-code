import { NextRequest, NextResponse } from "next/server";
import { updateProduct, deleteProduct } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["nombre", "categoria", "udm", "stock", "precio", "activo"];
  const patch: Record<string, string | number> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = typeof body[key] === "string" ? body[key] : Number(body[key]);
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "sin campos" }, { status: 400 });
  updateProduct(Number(id), patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteProduct(Number(id));
  return NextResponse.json({ ok: true });
}
