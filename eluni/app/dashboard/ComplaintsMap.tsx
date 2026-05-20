"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { ComplaintRow } from "./types";
import { useTheme } from "@/lib/theme/ThemeProvider";

// Ленивая инициализация плагина (типы)
type HeatLatLng = [number, number, number];
declare module "leaflet" {
  function heatLayer(
    latlngs: HeatLatLng[],
    options?: Record<string, unknown>
  ): L.Layer;
}

const BISHKEK: [number, number] = [42.8746, 74.5698];

const COLOR_PENDING = "#10b981"; // зелёный
const COLOR_IN_PROGRESS = "#f59e0b"; // оранжевый/жёлтый
const COLOR_URGENT = "#ef4444"; // красный

const URGENT_KEYWORDS = ["экстренн", "срочн", "emergency"];

function isUrgent(c: ComplaintRow): boolean {
  if (c.priority === "Высокий") return true;
  const cat = (c.category ?? "").toLowerCase();
  return URGENT_KEYWORDS.some((k) => cat.includes(k));
}

/** Цвет маркера по бизнес-логике: красный — срочное, иначе по статусу. */
function colorByStatus(c: ComplaintRow): string {
  if (isUrgent(c)) return COLOR_URGENT;
  if (c.status === "in_progress") return COLOR_IN_PROGRESS;
  return COLOR_PENDING;
}

function makeIcon(color: string, count: number): L.DivIcon {
  const size = count > 1 ? 44 : 32;
  const inner =
    count > 1
      ? `<span style="color:#fff;font-size:15px;font-weight:700;">${count}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid rgba(0,0,0,0.55);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 14px ${color}80;
    ">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
    if (c.lat === null || c.lng === null) continue;
    // округление до 4 знаков (~10м)
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

function HeatmapLayer({ points }: { points: HeatLatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius: 30,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.2: "#3b82f6",
        0.4: "#10b981",
        0.6: "#f59e0b",
        0.8: "#fb923c",
        1.0: "#ef4444",
      },
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points]);

  return null;
}

interface Props {
  complaints: ComplaintRow[];
  showHeatmap: boolean;
  org: string;
  onMarkerClick?: (c: ComplaintRow) => void;
  /** Жалоба, для которой надо показать leaflet-popup, привязанный к точке. */
  popupFor?: ComplaintRow | null;
  /** Текст кнопки «Подробнее» в попапе (i18n). */
  popupDetailsLabel?: string;
  /** Колбэк при клике на «Подробнее». */
  onPopupDetails?: (c: ComplaintRow) => void;
  /** Колбэк при закрытии попапа (по клику на крестик/карту). */
  onPopupClose?: () => void;
  height?: string;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Привязанный к координатам popup на маркере с действием «Подробнее». */
function MarkerPopup({
  complaint,
  detailsLabel,
  onDetails,
  onClose,
}: {
  complaint: ComplaintRow;
  detailsLabel: string;
  onDetails: (c: ComplaintRow) => void;
  onClose: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (complaint.lat == null || complaint.lng == null) return;

    const color = colorByStatus(complaint);
    const statusLabel = STATUS_LABELS_RU[complaint.status] ?? complaint.status;
    const text = (complaint.officialText || "").slice(0, 140);
    const html = `
      <div style="font-family:inherit;color:inherit;min-width:280px;max-width:320px;">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;font-size:13px;">
          <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;background:${color}25;color:${color};font-weight:700;">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};"></span>
            ${escapeHtml(statusLabel)}
          </span>
          <span style="padding:4px 10px;border-radius:8px;background:rgba(99,102,241,0.15);color:#6366f1;font-weight:600;">
            ${escapeHtml(complaint.category)}
          </span>
          <span style="padding:4px 10px;border-radius:8px;background:rgba(244,63,94,0.12);color:#ef4444;font-weight:600;">
            ${escapeHtml(complaint.priority)}
          </span>
        </div>
        <div style="font-size:14px;line-height:1.5;margin-bottom:12px;">
          ${escapeHtml(text)}${complaint.officialText.length > 140 ? "…" : ""}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;">
          <span style="opacity:.7;">${escapeHtml(formatTimeShort(complaint.createdAt))}</span>
          <button type="button" data-eluni-details
            style="cursor:pointer;border:0;border-radius:10px;padding:10px 16px;font-size:14px;font-weight:700;min-height:44px;
              background:#6366f1;color:#fff;">
            ${escapeHtml(detailsLabel)}
          </button>
        </div>
      </div>
    `;

    const popup = L.popup({
      offset: [0, -16],
      closeButton: true,
      autoClose: false,
      closeOnClick: false,
      className: "eluni-marker-popup",
    })
      .setLatLng([complaint.lat, complaint.lng])
      .setContent(html)
      .openOn(map);

    // Привязываем кнопку «Подробнее» внутри html
    const root = popup.getElement();
    const btn = root?.querySelector<HTMLButtonElement>(
      "button[data-eluni-details]"
    );
    const handler = (e: Event) => {
      e.stopPropagation();
      onDetails(complaint);
    };
    btn?.addEventListener("click", handler);

    map.on("popupclose", onClose);

    return () => {
      btn?.removeEventListener("click", handler);
      map.off("popupclose", onClose);
      map.closePopup(popup);
    };
  }, [map, complaint, detailsLabel, onDetails, onClose]);

  return null;
}

export default function ComplaintsMap({
  complaints,
  showHeatmap,
  onMarkerClick,
  popupFor,
  popupDetailsLabel = "Подробнее",
  onPopupDetails,
  onPopupClose,
  height,
}: Props) {
  const { theme } = useTheme();

  // Фильтр: на карте только активные жалобы (pending / in_progress).
  const active = useMemo(
    () => complaints.filter((c) => c.status !== "resolved"),
    [complaints]
  );

  const clusters = useMemo(() => clusterByCoords(active), [active]);

  const heatPoints: HeatLatLng[] = useMemo(
    () =>
      active
        .filter((c) => c.lat !== null && c.lng !== null)
        .map((c) => {
          const weight =
            c.priority === "Высокий" ? 1 : c.priority === "Средний" ? 0.6 : 0.3;
          return [c.lat as number, c.lng as number, weight];
        }),
    [active]
  );

  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const bg = theme === "dark" ? "#1E1E1E" : "#FAFAF5";

  return (
    <div
      className="overflow-hidden"
      style={{ width: "100%", height: height ?? "100%" }}
    >
      <MapContainer
        center={BISHKEK}
        zoom={13}
        style={{ height: "100%", width: "100%", background: bg }}
        scrollWheelZoom
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />

        {showHeatmap && <HeatmapLayer points={heatPoints} />}

        {clusters.map((cluster) => {
          // если в кластере есть срочные — окрашиваем кластер красным
          const urgentInCluster = cluster.items.find(isUrgent);
          const inProgress = cluster.items.find((c) => c.status === "in_progress");
          const repr = urgentInCluster ?? inProgress ?? cluster.items[0];
          const color = colorByStatus(repr);
          return (
            <Marker
              key={cluster.key}
              position={[cluster.lat, cluster.lng]}
              icon={makeIcon(color, cluster.items.length)}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(repr);
                },
              }}
              title={`${repr.category} · ${repr.priority}${
                repr.address ? ` · ${repr.address}` : ""
              }`}
            />
          );
        })}

        {popupFor &&
          popupFor.lat != null &&
          popupFor.lng != null &&
          popupFor.status !== "resolved" &&
          onPopupDetails && (
            <MarkerPopup
              complaint={popupFor}
              detailsLabel={popupDetailsLabel}
              onDetails={onPopupDetails}
              onClose={onPopupClose ?? (() => {})}
            />
          )}
      </MapContainer>
    </div>
  );
}
