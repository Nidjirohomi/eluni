import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyComplaint } from "@/lib/aiClassifier";
import { getCurrentUser, ROLE_TO_ORG } from "@/lib/auth";

export const runtime = "nodejs";

interface CreateComplaintBody {
  text?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  mediaUrls?: string[] | null;
  source?: string | null;
  telegramUserId?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateComplaintBody;
    const text = (body.text ?? "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Поле 'text' обязательно и не может быть пустым." },
        { status: 400 }
      );
    }

    const classification = await classifyComplaint(text);

    const complaint = await prisma.complaint.create({
      data: {
        originalText: text,
        officialText: classification.officialText,
        category: classification.category,
        priority: classification.priority,
        assignedTo: classification.assignedTo,
        address: body.address ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        mediaUrls:
          body.mediaUrls && body.mediaUrls.length > 0
            ? JSON.stringify(body.mediaUrls)
            : null,
        source: body.source ?? "web",
        telegramUserId: body.telegramUserId ?? null,
      },
    });

    return NextResponse.json(complaint, { status: 201 });
  } catch (err) {
    console.error("[POST /api/complaints] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Список жалоб — только для авторизованных госслужащих.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    // Жёсткая фильтрация по органу из роли — нельзя видеть чужие жалобы.
    const where: Record<string, string> = {
      assignedTo: ROLE_TO_ORG[user.role],
    };
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(complaints, { status: 200 });
  } catch (err) {
    console.error("[GET /api/complaints] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
