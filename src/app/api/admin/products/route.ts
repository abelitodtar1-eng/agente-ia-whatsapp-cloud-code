import { NextRequest, NextResponse } from "next/server";
import { listProducts, createProduct } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listProducts());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, categoria = "", udm = "", stock = 0, precio = 0, activo = 1 } = body;
  if (!nombre?.trim()) return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
  const product = createProduct({ nombre: nombre.trim(), categoria, udm, stock: Number(stock), precio: Number(precio), activo: Number(activo) });
  return NextResponse.json(product, { status: 201 });
}
