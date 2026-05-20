import { NextResponse } from "next/server";
import { getStatusHistory, deleteStatusItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getStatusHistory(50));
}

export async function DELETE(req: Request) {
  const { id } = await req.json() as { id: number };
  deleteStatusItem(id);
  return NextResponse.json({ ok: true });
}
