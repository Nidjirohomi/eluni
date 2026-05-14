import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db, type ComplaintModel } from "@/lib/models";
import { getCurrentUser, ROLE_TO_ORG, type Role } from "@/lib/auth";

export const runtime = "nodejs";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusLabel(s: string): string {
  if (s === "pending") return "В ожидании";
  if (s === "in_progress") return "В работе";
  if (s === "resolved") return "Решено";
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") ?? "weekly";
    const days = period === "monthly" ? 30 : 7;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const org = ROLE_TO_ORG[session.role as Role];

    const complaints = (await db.complaint.findMany({
      where: { assignedTo: org, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    })) as ComplaintModel[];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ElUni";
    workbook.created = new Date();

    // === Лист 1: общая статистика ===
    const wsStats = workbook.addWorksheet("Статистика");
    wsStats.columns = [
      { header: "Показатель", key: "k", width: 36 },
      { header: "Значение", key: "v", width: 16 },
    ];

    wsStats.addRow({ k: "Орган", v: org });
    wsStats.addRow({
      k: "Период",
      v: period === "monthly" ? "Последние 30 дней" : "Последние 7 дней",
    });
    wsStats.addRow({ k: "Всего жалоб", v: complaints.length });
    wsStats.addRow({});

    const byStatus = { pending: 0, in_progress: 0, resolved: 0 } as Record<
      string,
      number
    >;
    const byCategory = new Map<string, number>();
    const byPriority = new Map<string, number>();
    for (const c of complaints) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
      byPriority.set(c.priority, (byPriority.get(c.priority) ?? 0) + 1);
    }

    wsStats.addRow({ k: "В ожидании", v: byStatus.pending ?? 0 });
    wsStats.addRow({ k: "В работе", v: byStatus.in_progress ?? 0 });
    wsStats.addRow({ k: "Решено", v: byStatus.resolved ?? 0 });
    wsStats.addRow({});

    wsStats.addRow({ k: "— Категории —", v: "" });
    for (const [cat, n] of Array.from(byCategory.entries()).sort(
      (a, b) => b[1] - a[1]
    )) {
      wsStats.addRow({ k: cat, v: n });
    }
    wsStats.addRow({});

    wsStats.addRow({ k: "— Приоритеты —", v: "" });
    for (const [pr, n] of byPriority.entries()) {
      wsStats.addRow({ k: pr, v: n });
    }

    // Стиль заголовка
    wsStats.getRow(1).font = { bold: true };
    wsStats.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };

    // === Лист 2: таблица жалоб ===
    const wsRows = workbook.addWorksheet("Жалобы");
    wsRows.columns = [
      { header: "ID", key: "id", width: 26 },
      { header: "Дата", key: "createdAt", width: 19 },
      { header: "Категория", key: "category", width: 14 },
      { header: "Приоритет", key: "priority", width: 12 },
      { header: "Статус", key: "status", width: 13 },
      { header: "Адрес", key: "address", width: 36 },
      { header: "Исполнитель", key: "assignedUser", width: 24 },
      { header: "Текст", key: "officialText", width: 80 },
    ];
    wsRows.getRow(1).font = { bold: true };
    wsRows.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };

    for (const c of complaints) {
      wsRows.addRow({
        id: c.id,
        createdAt: c.createdAt.toISOString().replace("T", " ").slice(0, 19),
        category: c.category,
        priority: c.priority,
        status: statusLabel(c.status),
        address: c.address ?? "",
        assignedUser: c.assignedUser ?? "",
        officialText: c.officialText,
      });
    }

    // === Лист 3: прогноз на завтра (простое скользящее) ===
    const wsForecast = workbook.addWorksheet("Прогноз");
    wsForecast.columns = [
      { header: "Дата", key: "date", width: 14 },
      { header: "Жалоб", key: "count", width: 10 },
    ];
    wsForecast.getRow(1).font = { bold: true };

    const last7 = 7;
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < last7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (last7 - 1 - i));
      d.setHours(0, 0, 0, 0);
      dailyMap.set(dateKey(d), 0);
    }
    for (const c of complaints) {
      const k = dateKey(c.createdAt);
      if (dailyMap.has(k)) dailyMap.set(k, (dailyMap.get(k) ?? 0) + 1);
    }
    for (const [date, count] of dailyMap.entries()) {
      wsForecast.addRow({ date, count });
    }

    const counts = Array.from(dailyMap.values());
    const last3 = counts.slice(-3);
    const movingAvg = last3.length
      ? last3.reduce((a, b) => a + b, 0) / last3.length
      : 0;
    wsForecast.addRow({});
    wsForecast.addRow({
      date: "Ожидаемо завтра",
      count: Math.round(movingAvg),
    });
    wsForecast.lastRow!.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `eluni-report-${org}-${period}-${dateKey(new Date())}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          filename
        )}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/export] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
