import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, type UserModel } from "@/lib/models";

export const runtime = "nodejs";

/**
 * Возвращает информацию для UI «Привязать Telegram» в личном кабинете:
 *   - bindToken: код пользователя (если применимо);
 *   - telegramBound: уже ли привязан Telegram-аккаунт;
 *   - botUsername: username gov-бота (для генерации ссылки t.me/<bot>).
 */
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const user = (await db.user.findUnique({
      where: { id: session.userId },
    })) as UserModel | null;

    if (!user) {
      return NextResponse.json(
        { error: "Пользователь не найден." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      bindToken: user.bindToken ?? null,
      telegramBound: !!user.telegramUserId,
      botUsername:
        process.env.NEXT_PUBLIC_GOV_BOT_USERNAME ?? "ElUniGovBot",
    });
  } catch (err) {
    console.error("[GET /api/auth/bind-info] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
