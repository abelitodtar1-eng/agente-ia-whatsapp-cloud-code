import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, listUsers, createUser } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("dtar_session")?.value ?? "";
  const user = getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  return NextResponse.json(listUsers());
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  const { username, password, role } = await req.json();
  if (!username || !password || !["admin", "operator"].includes(role)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  try {
    const user = await createUser(String(username), String(password), role);
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });
  }
}
