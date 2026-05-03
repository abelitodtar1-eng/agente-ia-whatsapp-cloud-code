import { NextResponse } from "next/server";
import { getConnectionState } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const state = getConnectionState();
  const shouldShowQr =
    !!state.qr_string &&
    (state.status === "qr" || state.status === "connecting");

  return NextResponse.json({
    status: state.status,
    qr_string: shouldShowQr ? state.qr_string : null,
    phone: state.phone,
    updated_at: state.updated_at,
  });
}
