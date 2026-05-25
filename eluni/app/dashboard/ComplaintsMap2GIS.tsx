"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComplaintRow } from "./types";
import Map2GIS, { type MapPoint } from "./Map2GIS";

const COLOR_PENDING = "#10b981"; // зелёный
const COLOR_IN_PROGRESS = "#f59e0b"; // жёлто-оранжевый
const COLOR_URGENT = "#ef4444"; // красный

const URGENT_KEYWORDS = ["экстренн", "срочн", "emergency"];

function isUrgent(c: ComplaintRow): boolean {
  if (c.priority === "Высокий") return true;
  const cat = (c.category ?? "").toLowerCase();
  return URGENT_KEYWORDS.some((k) => cat.includes(k));
}

function colorByStatus(c: ComplaintRow): string {
  if (isUrgent(c)) return COLOR_URGENT;
  if (c.status === "in_progress") return COLOR_IN_PROGRESS;
  return COLOR_PENDING;
}

interface Cluster {
  key: string;
  lat: number;
  lng: number;
  items: ComplaintRow[];
}

function clusterByCoords(complaints: ComplaintRow[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const c of complaints) {
    if (c.lat == null || c.lng == null) continue;
    // округление до 4 знаков (~10 м).
    const key = `${c.lat.toFixed(4)}_${c.lng.toFixed(4)}`;
    let entry = map.get(key);
    if (!entry) {
      entry = { key, lat: c.lat, lng: c.lng, items: [] };
      map.set(key, entry);
    }
    entry.items.push(c);
  }
  return Array.from(map.values());
}

const STATUS_LABELS_RU: Record<string, string> = {
  pending: "Ожидание",
  in_progress: "В работе",
  resolved: "Решено",
};

function formatTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

interface Props {
  complaints: ComplaintRow[];
  /** Игнорируется в 2ГИС-версии (heatmap пока не реализован). */
  showHeatmap?: boolean;
  org: string;
  onMarkerClick?: (c: ComplaintRow) => void;
  /** Жалоба, для которой надо показать DOM-попап у точки. */
  popupFor?: ComplaintRow | null;
  popupDetailsLabel?: string;
  onPopupDetails?: (c: ComplaintRow) => void;
  onPopupClose?: () => void;
  height?: string;
}

/**
 * Замена Leaflet-карты на 2ГИС MapGL. Сохраняет тот же контракт:
 * приём `complaints`, кластеризацию по координатам, цвет по статусу,
 * клик по маркеру → выбор репрезентанта кластера, попап с «Подробнее».
 */
export default function ComplaintsMap2GIS({
  complaints,
  onMarkerClick,
  popupFor,
  popupDetailsLabel = "Подробнее",
  onPopupDetails,
  onPopupClose,
  height,
}: Props) {
  // Только активные жалобы на карте.
  const active = useMemo(
    () => complaints.filter((c) => c.status !== "resolved"),
    [complaints]
  );

  const clusters = useMemo(() => clusterByCoords(active), [active]);

  // Превратим кластеры в MapPoint для Map2GIS.
  const { points, indexById } = useMemo(() => {
    const map: Record<string, ComplaintRow> = {};
    const pts: MapPoint[] = clusters.map((cluster) => {
      const urgent = cluster.items.find(isUrgent);
      const inProgress = cluster.items.find((c) => c.status === "in_progress");
      const repr = urgent ?? inProgress ?? cluster.items[0];
      map[cluster.key] = repr;
      return {
        id: cluster.key,
        lat: cluster.lat,
        lng: cluster.lng,
        color: colorByStatus(repr),
        badge: cluster.items.length > 1 ? String(cluster.items.length) : undefined,
        title: `${repr.category} · ${repr.priority}${
          repr.address ? ` · ${repr.address}` : ""
        }`,
      };
    });
    return { points: pts, indexById: map };
  }, [clusters]);

  function handleMarkerClick(id: string) {
    const repr = indexById[id];
    if (repr && onMarkerClick) onMarkerClick(repr);
  }

  // DOM-overlay для попапа: рассчитываем абсолютное положение точки на канвасе
  // карты не получится без знаний внутренних API 2ГИС, поэтому показываем
  // компактный «toast» в углу — функционально это та же кнопка «Подробнее».
  // Закрытие — крестик. Это сохраняет UX, но не привязано к координате.
  const [popup, setPopup] = useState<ComplaintRow | null>(null);
  useEffect(() => {
    setPopup(popupFor ?? null);
  }, [popupFor]);

  return (
    <div className="relative" style={{ width: "100%", height: height ?? "100%" }}>
      <Map2GIS
        points={points}
        onMarkerClick={handleMarkerClick}
        height="100%"
      />

      {popup && popup.lat != null && popup.lng != null && (
        <div
          className="pointer-events-auto absolute left-1/2 top-4 z-[1000] w-[300px] max-w-[92vw] -translate-x-1/2 rounded-xl border border-app bg-surface/95 p-3 shadow-card backdrop-blur"
        >
          <div className="mb-2 flex items-start gap-2">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                background: `${colorByStatus(popup)}22`,
                color: colorByStatus(popup),
              }}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: colorByStatus(popup) }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-app">
                {popup.category}
              </div>
              <div className="text-[11px] text-muted-app">
                {STATUS_LABELS_RU[popup.status] ?? popup.status} ·{" "}
                {popup.priority}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPopup(null);
                onPopupClose?.();
              }}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-muted-app transition hover:bg-surface-2 hover:text-app"
              aria-label="Закрыть"
            >
              ✕
            </button>
          </div>

          <div className="mb-2.5 line-clamp-2 text-xs leading-snug text-app">
            {popup.officialText}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-app">
              {formatTimeShort(popup.createdAt)}
            </span>
            <button
              type="button"
              onClick={() => onPopupDetails?.(popup)}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-lg bg-accent-app px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            >
              {popupDetailsLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
