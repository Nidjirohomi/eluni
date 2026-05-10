import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSession, isRole, TOKEN_NAME } from "@/lib/auth";

export const runtime = "nodejs";

interface LoginBody {
  username?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";

    if (!username || !password) {
      return NextResponse.json(
        { error: "Введите логин и пароль." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Неверный логин или пароль." },
        { status: 401 }
      );
    }

    if (!isRole(user.role)) {
      return NextResponse.json(
        { error: "У пользователя некорректная роль." },
        { status: 500 }
      );
    }

    const token = await signSession({
      userId: user.id,
      role: user.role,
      username: user.username,
      displayName: user.displayName,
    });

    cookies().set(TOKEN_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 дней
    });

    return NextResponse.json(
      {
        success: true,
        role: user.role,
        displayName: user.displayName,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/auth/login] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
