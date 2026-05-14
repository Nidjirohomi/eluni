import { NextRequest, NextResponse } from "next/server";
import { db, type UserModel } from "@/lib/models";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

interface DutyBody {
  action?: "start" | "end";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as DutyBody;
    const action = body.action;

    if (action !== "start" && action !== "end") {
      return NextResponse.json(
        { error: "Поле 'action' должно быть 'start' или 'end'." },
        { status: 400 }
      );
    }

    const nextStatus = action === "start" ? "on_duty" : "off_duty";

    const updated = (await db.user.update({
      where: { id: user.userId },
      data: { status: nextStatus },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
      },
    })) as Pick<UserModel, "id" | "username" | "displayName" | "role" | "status">;

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error("[POST /api/auth/duty] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }
    const me = (await db.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
      },
    })) as Pick<UserModel, "id" | "username" | "displayName" | "role" | "status"> | null;

    return NextResponse.json({
      status: me?.status ?? "off_duty",
      user: me,
    });
  } catch (err) {
    console.error("[GET /api/auth/duty] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
