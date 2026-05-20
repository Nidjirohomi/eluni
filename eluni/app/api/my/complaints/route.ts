import { NextResponse } from "next/server";
import { db, type ComplaintModel } from "@/lib/models";
import { getCurrentUser, isCitizen } from "@/lib/auth";
import { parseMediaUrls } from "@/lib/media";

export const runtime = "nodejs";

/**
 * GET /api/my/complaints
 * Возвращает все жалобы текущего гражданина (по userId), включая решённые.
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
    if (!isCitizen(session.role)) {
      return NextResponse.json(
        { error: "Этот раздел доступен только гражданам." },
        { status: 403 }
      );
    }

    const complaints = (await db.complaint.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    })) as ComplaintModel[];

    return NextResponse.json(
      complaints.map((c) => ({
        ...c,
        mediaUrls: parseMediaUrls(c.mediaUrls),
      }))
    );
  } catch (err) {
    console.error("[GET /api/my/complaints] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
