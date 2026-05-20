import { NextRequest, NextResponse } from "next/server";
import { getGoogleSheetId, setGoogleSheetId } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ sheetId: getGoogleSheetId() });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { sheetId?: string };
  const id = (body.sheetId ?? "").trim();
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  setGoogleSheetId(id);
  return NextResponse.json({ ok: true });
}
