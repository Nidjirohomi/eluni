import { NextResponse } from "next/server";
import { db, type UserModel } from "@/lib/models";
import { getCurrentUser, ROLE_TO_ORG, type Role } from "@/lib/auth";

export const runtime = "nodejs";

// Список сотрудников «на смене» — для назначения жалоб начальником.
// MVP: доступен любому авторизованному пользователю своего органа.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const org = ROLE_TO_ORG[user.role as Role];

    const users = (await db.user.findMany({
      where: { status: "on_duty" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        status: true,
      },
      orderBy: { displayName: "asc" },
    })) as Array<Pick<UserModel, "id" | "username" | "displayName" | "role" | "status">>;

    const sameOrg = users.filter(
      (u) => ROLE_TO_ORG[u.role as Role] === org
    );

    return NextResponse.json({ org, users: sameOrg });
  } catch (err) {
    console.error("[GET /api/users/on-duty] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
