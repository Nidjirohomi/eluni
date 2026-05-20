/**
 * Хелперы для работы с полем Complaint.mediaUrls.
 * Хранится в БД как JSON-строка вида '["/uploads/xx.jpg", ...]'.
 */

export function parseMediaUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
    return [];
  } catch {
    return [];
  }
}

export function serializeMediaUrls(urls: string[] | null | undefined): string | null {
  if (!urls || urls.length === 0) return null;
  return JSON.stringify(urls);
}

const VIDEO_EXTS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];

export function isVideoUrl(url: string): boolean {
  const u = url.toLowerCase();
  return VIDEO_EXTS.some((ext) => u.endsWith(ext));
}
