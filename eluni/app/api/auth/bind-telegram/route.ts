import { NextRequest, NextResponse } from "next/server";
import { db, type UserModel } from "@/lib/models";

export const runtime = "nodejs";

interface BindBody {
  token?: string;
  telegramUserId?: string | number;
}

/**
 * Программная привязка Telegram-аккаунта к профилю по bindToken.
 *
 * В рабочем сценарии вызывается из gov-бота (`@ElUniGovBot`) при команде `/bind`,
 * но также может быть использован для серверных интеграций.
 *
 * Тело запроса: `{ token: string, telegramUserId: string | number }`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BindBody;
    const rawToken = (body.token ?? "").toString().trim();
    const code = rawToken.replace(/\s+/g, "").toUpperCase();
    const telegramUserId =
      body.telegramUserId !== undefined && body.telegramUserId !== null
        ? String(body.telegramUserId)
        : "";

    if (!code) {
      return NextResponse.json(
        { error: "Поле 'token' обязательно." },
        { status: 400 }
      );
    }
    if (!telegramUserId) {
      return NextResponse.json(
        { error: "Поле 'telegramUserId' обязательно." },
        { status: 400 }
      );
    }

    const user = (await db.user.findUnique({
      where: { bindToken: code },
    })) as UserModel | null;

    if (!user) {
      return NextResponse.json(
        { error: "Код не найден или уже использован." },
        { status: 404 }
      );
    }

    if (user.telegramUserId && user.telegramUserId !== telegramUserId) {
      return NextResponse.json(
        { error: "Код уже привязан к другому Telegram-аккаунту." },
        { status: 409 }
      );
    }

    const updated = (await db.user.update({
      where: { id: user.id },
      data: { telegramUserId },
    })) as UserModel;

    return NextResponse.json({
      success: true,
      userId: updated.id,
      displayName: updated.displayName,
    });
  } catch (err) {
    console.error("[POST /api/auth/bind-telegram] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
