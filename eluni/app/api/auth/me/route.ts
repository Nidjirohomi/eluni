import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/me
 * Возвращает данные текущего пользователя из JWT.
 * Используется клиентом (например, формой подачи жалобы) для проверки
 * авторизации без хранения секретов.
 */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(null);
  }
  return NextResponse.json({
    userId: me.userId,
    role: me.role,
    username: me.username,
    displayName: me.displayName,
  });
}
