import { NextResponse } from "next/server";
import { db, type ComplaintModel } from "@/lib/models";
import {
  getCurrentUser,
  ROLE_TO_ORG,
  isCitizen,
  isSuperadmin,
  type Role,
} from "@/lib/auth";
export const runtime = "nodejs";

// «Мои дела» — все жалобы, где assignedUser = displayName текущего пользователя
// и которые не resolved. Для citizen и superadmin — этот раздел не имеет смысла.
export async function GET() {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }
    if (isCitizen(session.role) || isSuperadmin(session.role)) {
      return NextResponse.json([], { status: 200 });
    }

    const org = ROLE_TO_ORG[session.role as Role];

    const complaints = (await db.complaint.findMany({
      where: {
        assignedTo: org,
        assignedUser: session.displayName,
        NOT: { status: "resolved" },
      },
      orderBy: { createdAt: "desc" },
    })) as ComplaintModel[];

    return NextResponse.json(complaints);
  } catch (err) {
    console.error("[GET /api/complaints/my] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
