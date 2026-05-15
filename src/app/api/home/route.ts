import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const conversations = db.prepare(`
    SELECT id, phone, phone_alias, name, mode, unread_count, last_message_at
    FROM conversations ORDER BY last_message_at DESC LIMIT 6
  `).all() as { id: number; phone: string; phone_alias: string | null; name: string | null; mode: string; unread_count: number; last_message_at: number | null }[];

  const { total: unreadTotal } = db.prepare(
    `SELECT COALESCE(SUM(unread_count), 0) as total FROM conversations`
  ).get() as { total: number };

  const pendingPayments = db.prepare(`
    SELECT p.id, p.description, p.amount, p.status, p.created_at,
           c.name as contact_name, c.phone as contact_phone, c.phone_alias
    FROM payments p JOIN conversations c ON c.id = p.conversation_id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC LIMIT 5
  `).all() as { id: number; description: string; amount: number; status: string; created_at: number; contact_name: string | null; contact_phone: string; phone_alias: string | null }[];

  const { count: pendingCount } = db.prepare(
    `SELECT COUNT(*) as count FROM payments WHERE status = 'pending'`
  ).get() as { count: number };

  return NextResponse.json({ unreadTotal, conversations, pendingPayments, pendingCount });
}
