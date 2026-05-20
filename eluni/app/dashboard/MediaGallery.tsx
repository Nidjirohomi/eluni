"use client";

import { useState } from "react";
import { Image as ImageIcon, X, Video } from "lucide-react";
import { isVideoUrl } from "@/lib/media";

interface Props {
  /** mediaUrls может прийти как массив (из новых ответов API), либо как строка JSON (старый формат), либо null. */
  media: string[] | string | null | undefined;
  title?: string;
}

/**
 * Миниатюры медиа-файлов жалобы + лайтбокс по клику.
 * Поддерживает изображения и видео.
 */
export function MediaGallery({ media, title }: Props) {
  const urls = normalize(media);
  const [open, setOpen] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <div>
      {title && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-app">
          <ImageIcon className="h-3.5 w-3.5" />
          {title}{" "}
          <span className="font-normal opacity-75">({urls.length})</span>
        </div>
      )}
      <ul className="grid grid-cols-3 gap-1.5">
        {urls.map((u, i) => (
          <li key={`${u}-${i}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="block aspect-square w-full overflow-hidden rounded-md border border-app bg-surface-2 transition hover:opacity-90"
              title={u.split("/").pop()}
            >
              {isVideoUrl(u) ? (
                <div className="relative h-full w-full">
                  <video
                    src={u}
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          </li>
        ))}
      </ul>

      {open !== null && urls[open] && (
        <Lightbox url={urls[open]} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideoUrl(url) ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}

function normalize(v: string[] | string | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((s) => typeof s === "string" && s);
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string" && !!s);
    }
  } catch {
    /* fallthrough */
  }
  return [];
}
