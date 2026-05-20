import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/db";
import {
  getCurrentUser,
  ROLE_TO_ORG,
  isCitizen,
  isSuperadmin,
} from "@/lib/auth";

export const runtime = "nodejs";

interface PredictionResponse {
  org: string;
  basedOnDays: number;
  total7d: number;
  expectedTomorrow: number;
  trend: "rising" | "falling" | "stable";
  spikeCategory: string | null;
  reasoning: string;
  daily: { date: string; count: number }[];
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    if (isCitizen(user.role)) {
      return NextResponse.json(
        { error: "Гражданам этот раздел недоступен." },
        { status: 403 }
      );
    }

    const sa = isSuperadmin(user.role);
    const org = sa ? "*" : ROLE_TO_ORG[user.role];
    const days = 7;

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    interface ComplaintSlice {
      category: string;
      createdAt: Date;
    }

    const complaints = (await prisma.complaint.findMany({
      where: sa
        ? { createdAt: { gte: since } }
        : { assignedTo: org, createdAt: { gte: since } },
      select: { category: true, createdAt: true },
    })) as ComplaintSlice[];

    // Группируем по дням
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      d.setHours(0, 0, 0, 0);
      dailyMap.set(dateKey(d), 0);
    }
    for (const c of complaints) {
      const key = dateKey(c.createdAt);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const daily = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Простой прогноз = скользящее среднее по последним 3 дням
    const counts = daily.map((d) => d.count);
    const last3 = counts.slice(-3);
    const movingAvg = last3.length
      ? last3.reduce((a, b) => a + b, 0) / last3.length
      : 0;

    // Тренд: сравним среднее последних 3 дней vs предыдущих 3
    const prev3 = counts.slice(-6, -3);
    const prevAvg = prev3.length
      ? prev3.reduce((a, b) => a + b, 0) / prev3.length
      : movingAvg;
    let trend: "rising" | "falling" | "stable" = "stable";
    if (movingAvg > prevAvg * 1.2) trend = "rising";
    else if (movingAvg < prevAvg * 0.8) trend = "falling";

    // Топ-категория последних 3 дней (потенциальный «всплеск»)
    const lastCutoff = new Date();
    lastCutoff.setDate(lastCutoff.getDate() - 3);
    const recent = complaints.filter((c) => c.createdAt >= lastCutoff);
    const catMap = new Map<string, number>();
    for (const c of recent) {
      catMap.set(c.category, (catMap.get(c.category) ?? 0) + 1);
    }
    const spikeCategory = Array.from(catMap.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? null;

    let expectedTomorrow = Math.round(movingAvg);
    if (trend === "rising") expectedTomorrow = Math.ceil(movingAvg * 1.15);
    if (trend === "falling") expectedTomorrow = Math.floor(movingAvg * 0.85);

    let reasoning = `Скользящее среднее за последние 3 дня: ${movingAvg.toFixed(1)} жалоб/день. Тренд: ${trend === "rising" ? "рост" : trend === "falling" ? "снижение" : "стабильный"}.`;

    // Если есть GROQ_API_KEY — попросим модель дать «человеческое» обоснование
    if (process.env.GROQ_API_KEY && complaints.length >= 3) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Ты — аналитик городских жалоб. Получаешь статистику и возвращаешь ТОЛЬКО JSON: {\"reasoning\": \"короткое объяснение прогноза на завтра на русском, 1-2 предложения, без лишних слов\"}.",
            },
            {
              role: "user",
              content: JSON.stringify({
                org,
                daily,
                trend,
                expectedTomorrow,
                spikeCategory,
                topCategoriesLast3d: Array.from(catMap.entries()).slice(0, 3),
              }),
            },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw) as { reasoning?: string };
        if (typeof parsed.reasoning === "string" && parsed.reasoning.trim()) {
          reasoning = parsed.reasoning.trim();
        }
      } catch (err) {
        console.error("[predictions] Groq fallback:", err);
      }
    }

    const response: PredictionResponse = {
      org,
      basedOnDays: days,
      total7d: complaints.length,
      expectedTomorrow,
      trend,
      spikeCategory,
      reasoning,
      daily,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/predictions] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
