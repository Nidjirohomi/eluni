import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  ROLE_TO_ORG,
  canActOnComplaints,
} from "@/lib/auth";
import { parseMediaUrls } from "@/lib/media";

export const runtime = "nodejs";

const VALID_STATUSES = ["pending", "in_progress", "resolved"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.id },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "Жалоба с указанным ID не найдена." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...complaint, mediaUrls: parseMediaUrls(complaint.mediaUrls) },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/complaints/:id] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Менять статус может только авторизованный госслужащий, кроме супер-админа.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }
    if (!canActOnComplaints(user.role)) {
      return NextResponse.json(
        { error: "У вас нет прав на изменение жалоб." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      status?: string;
      assignedUser?: string | null;
    };
    const status = body.status;

    if (!status || !VALID_STATUSES.includes(status as Status)) {
      return NextResponse.json(
        {
          error: `Поле 'status' обязательно и должно быть одним из: ${VALID_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Проверим, что жалоба принадлежит органу текущего пользователя.
    const existing = await prisma.complaint.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Жалоба не найдена." },
        { status: 404 }
      );
    }
    if (existing.assignedTo !== ROLE_TO_ORG[user.role]) {
      return NextResponse.json(
        { error: "Нет прав на изменение этой жалобы." },
        { status: 403 }
      );
    }

    const updated = await prisma.complaint.update({
      where: { id: params.id },
      data: {
        status,
        ...(body.assignedUser !== undefined
          ? { assignedUser: body.assignedUser || null }
          : {}),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/complaints/:id] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
