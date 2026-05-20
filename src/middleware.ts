import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/api/auth/", "/api/product-images", "/api/contacts", "/api/admin/estados/publish"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const session = request.cookies.get("dtar_session")?.value;
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
