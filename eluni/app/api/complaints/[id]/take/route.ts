import { NextRequest, NextResponse } from "next/server";
import { db, type ComplaintModel, type UserModel } from "@/lib/models";
import { getCurrentUser, ROLE_TO_ORG, type Role } from "@/lib/auth";

export const runtime = "nodejs";

// «Взять жалобу самому» — assignedUser = текущий пользователь.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const complaint = (await db.complaint.findUnique({
      where: { id: params.id },
    })) as ComplaintModel | null;

    if (!complaint) {
      return NextResponse.json(
        { error: "Жалоба не найдена." },
        { status: 404 }
      );
    }

    if (complaint.assignedTo !== ROLE_TO_ORG[session.role as Role]) {
      return NextResponse.json(
        { error: "Нет прав на эту жалобу." },
        { status: 403 }
      );
    }

    const me = (await db.user.findUnique({
      where: { id: session.userId },
    })) as UserModel | null;

    if (!me) {
      return NextResponse.json(
        { error: "Пользователь не найден." },
        { status: 404 }
      );
    }

    // Требуем on_duty, иначе нельзя «взять» жалобу.
    if (me.status !== "on_duty") {
      return NextResponse.json(
        { error: "Сначала начните смену." },
        { status: 400 }
      );
    }

    const updated = (await db.complaint.update({
      where: { id: params.id },
      data: {
        status: "in_progress",
        assignedUser: me.displayName,
      },
    })) as ComplaintModel;

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/complaints/:id/take] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
