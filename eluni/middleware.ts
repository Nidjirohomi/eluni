import { NextResponse, type NextRequest } from "next/server";
import { verifySession, TOKEN_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  // Защита всех /dashboard/* — нет токена/сессии → редирект на /login
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
