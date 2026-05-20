import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { prisma } from "@/lib/db";
import { db, type ComplaintModel, type UserModel } from "@/lib/models";
import { classifyComplaint } from "@/lib/aiClassifier";
import {
  getCurrentUser,
  ROLE_TO_ORG,
  isCitizen,
  isSuperadmin,
} from "@/lib/auth";
import { parseMediaUrls, serializeMediaUrls } from "@/lib/media";

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

const ALLOWED_MEDIA = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|ogg))$/i;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB на файл
const MAX_FILES = 6;

async function saveUploadedFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const urls: string[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    if (!f || typeof f.size !== "number") continue;
    if (f.size === 0 || f.size > MAX_FILE_BYTES) continue;
    if (f.type && !ALLOWED_MEDIA.test(f.type)) continue;

    const ext = path.extname(f.name || "") || extFromMime(f.type);
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const filepath = path.join(dir, filename);
    const buffer = Buffer.from(await f.arrayBuffer());
    await writeFile(filepath, buffer);
    urls.push(`/uploads/${filename}`);
  }
  return urls;
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/ogg": ".ogv",
  };
  return map[mime?.toLowerCase()] ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") ?? "";

    let text = "";
    let address: string | null = null;
    let lat: number | null = null;
    let lng: number | null = null;
    let source = "web";
    let telegramUserId: string | null = null;
    let mediaUrls: string[] = [];

    if (ct.includes("multipart/form-data")) {
      // Гражданская форма с файлами
      const form = await req.formData();
      text = String(form.get("text") ?? "").trim();
      const a = form.get("address");
      address = typeof a === "string" && a.trim() ? a.trim() : null;
      const latV = form.get("lat");
      const lngV = form.get("lng");
      lat = typeof latV === "string" && latV ? Number(latV) : null;
      lng = typeof lngV === "string" && lngV ? Number(lngV) : null;
      const src = form.get("source");
      source = typeof src === "string" && src ? src : "web";

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      mediaUrls = await saveUploadedFiles(files);
    } else {
      const body = (await req.json()) as CreateComplaintBody;
      text = (body.text ?? "").trim();
      address = body.address ?? null;
      lat = body.lat ?? null;
      lng = body.lng ?? null;
      source = body.source ?? "web";
      telegramUserId = body.telegramUserId ?? null;
      mediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : [];
    }

    if (!text) {
      return NextResponse.json(
        { error: "Поле 'text' обязательно и не может быть пустым." },
        { status: 400 }
      );
    }

    // Адрес — обязательное поле: либо текстовый адрес, либо координаты на карте.
    const hasCoords = typeof lat === "number" && typeof lng === "number";
    const hasAddress = !!(address && address.trim());
    if (!hasAddress && !hasCoords) {
      return NextResponse.json(
        {
          error:
            "Укажите адрес на карте: введите его в поле адреса или поставьте точку на карте.",
        },
        { status: 400 }
      );
    }

    // Источник — гражданин с сайта обязан быть авторизован.
    // Анонимные жалобы принимаем только из Telegram-бота.
    const me = await getCurrentUser();
    let userId: string | null = me?.userId ?? null;

    if (source === "telegram") {
      // Если у Telegram-пользователя есть профиль — привяжем жалобу к нему,
      // иначе — анонимная (userId остаётся null).
      if (!userId && telegramUserId) {
        const linked = (await db.user.findFirst({
          where: { telegramUserId },
        })) as UserModel | null;
        if (linked) userId = linked.id;
      }
    } else {
      // web и любые другие источники — нужна сессия.
      if (!me) {
        return NextResponse.json(
          {
            error:
              "Подача жалобы через сайт доступна только верифицированным пользователям. Войдите через Түндүк или используйте Telegram-бота.",
          },
          { status: 401 }
        );
      }
      if (isSuperadmin(me.role)) {
        return NextResponse.json(
          { error: "Супер-администратор не может подавать жалобы." },
          { status: 403 }
        );
      }
      // Госслужащим на сайте подавать жалобы не положено — это поток гражданина.
      if (!isCitizen(me.role)) {
        return NextResponse.json(
          {
            error:
              "Этот аккаунт зарегистрирован как госслужащий — пользуйтесь рабочим кабинетом.",
          },
          { status: 403 }
        );
      }
    }

    const classification = await classifyComplaint(text);

    const complaint = (await db.complaint.create({
      data: {
        originalText: text,
        officialText: classification.officialText,
        category: classification.category,
        priority: classification.priority,
        assignedTo: classification.assignedTo,
        address,
        lat,
        lng,
        mediaUrls: serializeMediaUrls(mediaUrls),
        source,
        telegramUserId,
        userId,
      },
    })) as ComplaintModel;

    return NextResponse.json(
      { ...complaint, mediaUrls: parseMediaUrls(complaint.mediaUrls) },
      { status: 201 }
    );
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
    if (isCitizen(user.role)) {
      return NextResponse.json(
        { error: "Гражданам этот раздел недоступен." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    // Супер-админ видит ВСЕ органы; обычные роли — только свой.
    const where: Record<string, string> = {};
    if (!isSuperadmin(user.role)) {
      where.assignedTo = ROLE_TO_ORG[user.role];
    }
    if (category) where.category = category;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const complaints = (await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as ComplaintModel[];

    return NextResponse.json(
      complaints.map((c) => ({
        ...c,
        mediaUrls: parseMediaUrls(c.mediaUrls),
      })),
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/complaints] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
