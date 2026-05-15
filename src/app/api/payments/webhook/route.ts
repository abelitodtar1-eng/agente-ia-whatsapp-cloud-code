import { NextRequest, NextResponse } from "next/server";
import { updatePaymentStatus } from "@/lib/db";

// Enzona redirects buyer here after payment confirmation or cancellation.
// Also accepts POST notifications from Enzona backend.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "completed" | "cancelled" | null;
  const uuid = searchParams.get("uuid");

  if (uuid && (status === "completed" || status === "cancelled")) {
    updatePaymentStatus(uuid, status);
  }

  // Redirect to CRM root so buyer sees a confirmation page
  return NextResponse.redirect(new URL("/?payment=" + (status ?? "done"), req.url));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { transaction_uuid?: string; status_id?: number };
    if (body.transaction_uuid) {
      // Enzona status_id: 1=pending, 2=completed, 3=cancelled, 4=failed
      const statusMap: Record<number, "pending" | "completed" | "cancelled" | "failed"> = {
        1: "pending", 2: "completed", 3: "cancelled", 4: "failed",
      };
      const status = statusMap[body.status_id ?? 0] ?? "failed";
      updatePaymentStatus(body.transaction_uuid, status);
    }
  } catch { /* ignore malformed */ }
  return NextResponse.json({ ok: true });
}
