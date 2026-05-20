import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { db, type ComplaintModel } from "@/lib/models";
import { classifyComplaint } from "@/lib/aiClassifier";
import { getCurrentUser, isCitizen } from "@/lib/auth";
import { parseMediaUrls, serializeMediaUrls } from "@/lib/media";

export const runtime = "nodejs";

const ALLOWED_MEDIA = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|ogg))$/i;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 6;
const UPLOAD_PREFIX = "/uploads/";

/** Записать загруженные файлы из формы в /public/uploads. */
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
    urls.push(`${UPLOAD_PREFIX}${filename}`);
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

/** Удалить файлы из /public/uploads (best-effort). */
async function tryDeleteLocalFiles(urls: string[]) {
  for (const u of urls) {
    if (!u.startsWith(UPLOAD_PREFIX)) continue;
    const rel = u.slice(UPLOAD_PREFIX.length);
    if (!rel || rel.includes("..") || rel.includes("/") || rel.includes("\\")) {
      continue;
    }
    const fp = path.join(process.cwd(), "public", "uploads", rel);
    try {
      await unlink(fp);
    } catch {
      /* ignore — файл уже удалён или путь недоступен */
    }
  }
}

async function fetchOwn(
  id: string,
  userId: string
): Promise<ComplaintModel | null> {
  const complaint = (await db.complaint.findUnique({
    where: { id },
  })) as ComplaintModel | null;
  if (!complaint || complaint.userId !== userId) return null;
  return complaint;
}

/**
 * PATCH /api/my/complaints/[id]
 * Редактирование собственной жалобы. Доступно ТОЛЬКО при status === "pending".
 * Можно изменить text / address / lat,lng / mediaUrls (multipart files).
 *
 * Поддерживает:
 *   - JSON: { text?, address?, lat?, lng?, removeMediaUrls?: string[] }
 *   - multipart/form-data: те же поля + files (список новых файлов).
 */
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
    if (!isCitizen(session.role)) {
      return NextResponse.json(
        { error: "Этот раздел доступен только гражданам." },
        { status: 403 }
      );
    }

    const existing = await fetchOwn(params.id, session.userId);
    if (!existing) {
      return NextResponse.json(
        { error: "Жалоба не найдена или вам не принадлежит." },
        { status: 404 }
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Редактировать можно только жалобы со статусом «В ожидании». Жалоба уже в работе или закрыта.",
        },
        { status: 400 }
      );
    }

    const ct = req.headers.get("content-type") ?? "";
    let text: string | undefined;
    let address: string | null | undefined;
    let lat: number | null | undefined;
    let lng: number | null | undefined;
    let removeMediaUrls: string[] = [];
    let newFiles: File[] = [];

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const t = form.get("text");
      if (typeof t === "string") text = t.trim();
      const a = form.get("address");
      if (typeof a === "string") address = a.trim() || null;
      const latV = form.get("lat");
      const lngV = form.get("lng");
      if (typeof latV === "string" && latV) lat = Number(latV);
      if (typeof lngV === "string" && lngV) lng = Number(lngV);

      const remove = form.get("removeMediaUrls");
      if (typeof remove === "string" && remove) {
        try {
          const parsed = JSON.parse(remove);
          if (Array.isArray(parsed))
            removeMediaUrls = parsed.filter((s) => typeof s === "string");
        } catch {
          /* ignore */
        }
      }

      newFiles = form
        .getAll("files")
        .filter((f): f is File => f instanceof File);
    } else {
      const body = (await req.json().catch(() => ({}))) as {
        text?: string;
        address?: string | null;
        lat?: number | null;
        lng?: number | null;
        removeMediaUrls?: string[];
      };
      if (typeof body.text === "string") text = body.text.trim();
      if (body.address !== undefined)
        address = body.address ? body.address.trim() : null;
      if (body.lat !== undefined) lat = body.lat;
      if (body.lng !== undefined) lng = body.lng;
      if (Array.isArray(body.removeMediaUrls)) {
        removeMediaUrls = body.removeMediaUrls.filter(
          (s) => typeof s === "string"
        );
      }
    }

    // Подсчёт итогового списка медиа: текущие минус удаляемые + новые загруженные.
    const currentMedia = parseMediaUrls(existing.mediaUrls);
    const keepMedia = currentMedia.filter((u) => !removeMediaUrls.includes(u));
    const uploadedNew = await saveUploadedFiles(newFiles);
    const finalMedia = [...keepMedia, ...uploadedNew].slice(0, MAX_FILES);

    // Адрес обязателен — после правки тоже.
    const finalAddress = address !== undefined ? address : existing.address;
    const finalLat = lat !== undefined ? lat : existing.lat;
    const finalLng = lng !== undefined ? lng : existing.lng;
    const hasAddr = !!(finalAddress && finalAddress.trim());
    const hasCoords = typeof finalLat === "number" && typeof finalLng === "number";
    if (!hasAddr && !hasCoords) {
      return NextResponse.json(
        { error: "Укажите адрес на карте." },
        { status: 400 }
      );
    }

    // Если поменялся текст — переклассифицируем (новая категория/орган/приоритет).
    const finalText = text !== undefined && text ? text : existing.originalText;
    let officialText = existing.officialText;
    let category = existing.category;
    let priority = existing.priority;
    let assignedTo = existing.assignedTo;
    if (text !== undefined && text && text !== existing.originalText) {
      const cls = await classifyComplaint(finalText);
      officialText = cls.officialText;
      category = cls.category;
      priority = cls.priority;
      assignedTo = cls.assignedTo;
    }

    const updated = (await db.complaint.update({
      where: { id: params.id },
      data: {
        originalText: finalText,
        officialText,
        category,
        priority,
        assignedTo,
        address: finalAddress,
        lat: finalLat,
        lng: finalLng,
        mediaUrls: serializeMediaUrls(finalMedia),
      },
    })) as ComplaintModel;

    // Файлы, удалённые из жалобы, удалим и физически.
    if (removeMediaUrls.length > 0) {
      await tryDeleteLocalFiles(removeMediaUrls);
    }

    return NextResponse.json({
      ...updated,
      mediaUrls: parseMediaUrls(updated.mediaUrls),
    });
  } catch (err) {
    console.error("[PATCH /api/my/complaints/:id] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/my/complaints/[id]
 * Отозвать собственную жалобу. Доступно ТОЛЬКО при status === "pending".
 */
export async function DELETE(
  _req: NextRequest,
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
    if (!isCitizen(session.role)) {
      return NextResponse.json(
        { error: "Этот раздел доступен только гражданам." },
        { status: 403 }
      );
    }

    const existing = await fetchOwn(params.id, session.userId);
    if (!existing) {
      return NextResponse.json(
        { error: "Жалоба не найдена или вам не принадлежит." },
        { status: 404 }
      );
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Отозвать можно только жалобы со статусом «В ожидании». Жалоба уже в работе или закрыта.",
        },
        { status: 400 }
      );
    }

    const media = parseMediaUrls(existing.mediaUrls);

    await db.complaint.delete({ where: { id: params.id } });
    await tryDeleteLocalFiles(media);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/my/complaints/:id] error:", err);
    const message =
      err instanceof Error ? err.message : "Внутренняя ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
