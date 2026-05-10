import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, ROLE_TO_ORG } from "@/lib/auth";

export const runtime = "nodejs";

interface MonthlyPoint {
  month: string; // YYYY-MM
  count: number;
}

interface DistrictRow {
  district: string;
  count: number;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const monthsRaw = parseInt(searchParams.get("months") ?? "6", 10);
    const months = Number.isFinite(monthsRaw)
      ? Math.min(Math.max(monthsRaw, 1), 24)
      : 6;

    const since = new Date();
    since.setMonth(since.getMonth() - months);
    since.setHours(0, 0, 0, 0);

    const org = ROLE_TO_ORG[user.role];

    interface ComplaintSlice {
      category: string;
      status: string;
      priority: string;
      address: string | null;
      lat: number | null;
      lng: number | null;
      createdAt: Date;
      updatedAt: Date;
    }

    const complaints = (await prisma.complaint.findMany({
      where: { assignedTo: org, createdAt: { gte: since } },
      select: {
        category: true,
        status: true,
        priority: true,
        address: true,
        lat: true,
        lng: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as ComplaintSlice[];

    // Total + by status
    const total = complaints.length;
    const byStatus = { pending: 0, in_progress: 0, resolved: 0 } as Record<
      string,
      number
    >;
    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    }

    // Категории
    const byCategoryMap = new Map<string, number>();
    for (const c of complaints) {
      byCategoryMap.set(c.category, (byCategoryMap.get(c.category) ?? 0) + 1);
    }
    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Приоритеты
    const byPriorityMap = new Map<string, number>();
    for (const c of complaints) {
      byPriorityMap.set(c.priority, (byPriorityMap.get(c.priority) ?? 0) + 1);
    }
    const byPriority = Array.from(byPriorityMap.entries()).map(
      ([priority, count]) => ({ priority, count })
    );

    // Динамика по месяцам (заполним пустые)
    const monthlyMap = new Map<string, number>();
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, 0);
    }
    for (const c of complaints) {
      const d = c.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
      }
    }
    const monthly: MonthlyPoint[] = Array.from(monthlyMap.entries()).map(
      ([month, count]) => ({ month, count })
    );

    // Топ-5 проблемных районов (по адресу или округлённым координатам)
    const districtMap = new Map<string, number>();
    for (const c of complaints) {
      let key: string | null = null;
      if (c.address && c.address.trim().length > 0) {
        // Берём первые 2 значимых слова адреса как «район»
        key = c.address.trim().split(/[,\n]/)[0].trim();
      } else if (typeof c.lat === "number" && typeof c.lng === "number") {
        key = `${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`;
      }
      if (!key) continue;
      districtMap.set(key, (districtMap.get(key) ?? 0) + 1);
    }
    const topDistricts: DistrictRow[] = Array.from(districtMap.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Среднее время решения (для resolved)
    const resolved = complaints.filter((c) => c.status === "resolved");
    let avgResolutionHours: number | null = null;
    if (resolved.length > 0) {
      const totalMs = resolved.reduce(
        (acc, c) => acc + (c.updatedAt.getTime() - c.createdAt.getTime()),
        0
      );
      avgResolutionHours = +(totalMs / resolved.length / 1000 / 3600).toFixed(1);
    }

    return NextResponse.json({
      org,
      months,
      total,
      byStatus,
      byCategory,
      byPriority,
      monthly,
      topDistricts,
      avgResolutionHours,
    });
  } catch (err) {
    console.error("[GET /api/analytics] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
