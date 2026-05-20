import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEstadosApiToken } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const token = req.cookies.get("dtar_session")?.value ?? "";
  const user = getSessionUser(token);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return NextResponse.json({ token: getEstadosApiToken() });
}
