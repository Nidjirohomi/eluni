import { NextResponse, type NextRequest } from "next/server";
import { verifySession, TOKEN_NAME, isCitizen } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  const path = req.nextUrl.pathname;

  // Все защищённые маршруты требуют сессии.
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", path);
    return NextResponse.redirect(url);
  }

  // Гражданин не должен попадать в служебный кабинет.
  if (path.startsWith("/dashboard") && isCitizen(session.role)) {
    return NextResponse.redirect(new URL("/my/complaints", req.url));
  }

  // /my/* — личный кабинет гражданина: служебные роли отправляем в /dashboard.
  if (path.startsWith("/my") && !isCitizen(session.role)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/my/:path*"],
};
