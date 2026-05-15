import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, updateUserRole, updateUserPassword, deleteUser } from "@/lib/auth";

function requireAdmin(req: NextRequest) {
  const token = req.cookies.get("dtar_session")?.value ?? "";
  const user = getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  const { role, password } = await req.json();

  if (role && ["admin", "operator"].includes(role)) updateUserRole(userId, role);
  if (password) await updateUserPassword(userId, String(password));

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const userId = Number(id);
  if (userId === admin.id) {
    return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
  }
  deleteUser(userId);
  return NextResponse.json({ ok: true });
}
