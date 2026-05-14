import { NextRequest, NextResponse } from "next/server";
import { db, type ComplaintModel, type UserModel } from "@/lib/models";
import { getCurrentUser, ROLE_TO_ORG, type Role } from "@/lib/auth";
import { sendAssignmentNotification } from "@/lib/telegramNotifier";

export const runtime = "nodejs";

interface AssignBody {
  assignedUserId?: string;
}

export async function PATCH(
  req: NextRequest,
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

    const body = (await req.json().catch(() => ({}))) as AssignBody;
    if (!body.assignedUserId) {
      return NextResponse.json(
        { error: "Поле 'assignedUserId' обязательно." },
        { status: 400 }
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
        { error: "Нет прав: жалоба относится к другому органу." },
        { status: 403 }
      );
    }

    const assignee = (await db.user.findUnique({
      where: { id: body.assignedUserId },
    })) as UserModel | null;

    if (!assignee) {
      return NextResponse.json(
        { error: "Сотрудник не найден." },
        { status: 404 }
      );
    }

    if (ROLE_TO_ORG[assignee.role as Role] !== complaint.assignedTo) {
      return NextResponse.json(
        { error: "Сотрудник принадлежит другому органу." },
        { status: 400 }
      );
    }

    const updated = (await db.complaint.update({
      where: { id: params.id },
      data: {
        status: "in_progress",
        assignedUser: assignee.displayName,
      },
    })) as ComplaintModel;

    // Telegram-уведомление (best-effort, не блокирует ответ)
    let notification: { ok: boolean; error?: string } = {
      ok: false,
      error: "no_telegram",
    };
    if (assignee.telegramUserId) {
      notification = await sendAssignmentNotification({
        telegramUserId: assignee.telegramUserId,
        complaintId: updated.id,
        category: updated.category,
        priority: updated.priority,
        address: updated.address,
        officialText: updated.officialText,
      });
    }

    return NextResponse.json({
      ...updated,
      assignee: {
        id: assignee.id,
        displayName: assignee.displayName,
        username: assignee.username,
      },
      notification,
    });
  } catch (err) {
    console.error("[PATCH /api/complaints/:id/assign] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
