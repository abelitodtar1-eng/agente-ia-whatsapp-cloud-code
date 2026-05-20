import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getSessionUser } from "./auth";
import { getEstadosApiToken } from "./db";

/**
 * Acepta Bearer token (para n8n) o session cookie (para UI).
 * Retorna true si la request está autorizada.
 */
export function validateEstadosAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const provided = auth.slice(7).trim();
    const stored = getEstadosApiToken();
    if (stored.length === 0) return false;
    const storedBuf = Buffer.from(stored, "utf8");
    const providedBuf = Buffer.from(provided, "utf8");
    if (storedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(storedBuf, providedBuf);
  }
  const sessionToken = req.cookies.get("dtar_session")?.value;
  if (sessionToken) {
    return getSessionUser(sessionToken) !== null;
  }
  return false;
}
