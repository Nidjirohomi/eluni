import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_NAME } from "@/lib/auth";

export const runtime = "nodejs";

function clearCookie() {
  cookies().set(TOKEN_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  clearCookie();
  return NextResponse.json({ success: true });
}

// GET-обработчик нужен, чтобы кнопку «Выйти» можно было сделать
// обычной ссылкой <a href="/api/auth/logout">.
export async function GET(req: NextRequest) {
  clearCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}
