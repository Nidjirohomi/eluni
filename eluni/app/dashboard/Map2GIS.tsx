"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { TWOGIS_KEY, BISHKEK_LAT, BISHKEK_LNG } from "@/lib/twogis";

/**
 * Минимальные типы MapGL JS API 2ГИС, чтобы не тянуть огромный @types-пакет.
 * Используем только методы, которые нам нужны.
 */
type MapGLLngLat = [number, number]; // [lng, lat]

interface MapGLMap {
  destroy(): void;
  setCenter(c: MapGLLngLat): void;
  on(event: string, fn: (e: { lngLat: MapGLLngLat }) => void): void;
}

interface MapGLMarker {
  destroy(): void;
  on(event: string, fn: () => void): void;
  setCoordinates?(c: MapGLLngLat): void;
}

interface MapGLHtmlMarker extends MapGLMarker {
  getElement?(): HTMLElement;
}

interface MapGLNS {
  Map: new (
    container: HTMLElement | string,
    opts: {
      center: MapGLLngLat;
      zoom: number;
      key: string;
      style?: string;
      zoomControl?: boolean;
    }
  ) => MapGLMap;
  Marker: new (
    map: MapGLMap,
    opts: {
      coordinates: MapGLLngLat;
      icon?: string;
      size?: [number, number];
      anchor?: [number, number];
    }
  ) => MapGLMarker;
  HtmlMarker: new (
    map: MapGLMap,
    opts: {
      coordinates: MapGLLngLat;
      html: string;
      anchor?: [number, number];
    }
  ) => MapGLHtmlMarker;
}

type LoadFn = () => Promise<MapGLNS>;

let _mapglPromise: Promise<MapGLNS> | null = null;
async function loadMapGL(): Promise<MapGLNS> {
  if (!_mapglPromise) {
    _mapglPromise = import("@2gis/mapgl").then((m) => {
      const load = (m as unknown as { load: LoadFn }).load;
      return load();
    });
  }
  return _mapglPromise;
}

// ─── Конфигурация маркеров ──────────────────────────────────────────────

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  /** Цвет маркера (если не указан — accent-цвет). */
  color?: string;
  /** Подпись внутри маркера (для кластеров). */
  badge?: string;
  /** Подсказка по hover. */
  title?: string;
}

interface Props {
  /** Маркеры для отображения. */
  points?: MapPoint[];
  /** Клик по маркеру. */
  onMarkerClick?: (id: string) => void;
  /** Клик по карте (например, для выбора точки). Возвращает координаты. */
  onMapClick?: (p: { lat: number; lng: number }) => void;
  /** Точка-«пин» (для picker-режима), всегда одна. */
  pin?: { lat: number; lng: number } | null;
  /** Центр и зум по умолчанию. */
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Высота контейнера (CSS-значение, например "100%" или "320px"). */
  height?: string;
}

const ACCENT = "#6366f1";

function svgMarker(color: string, badge?: string): string {
  const ringSize = badge ? 44 : 32;
  const inner = badge
    ? `<text x="${ringSize / 2}" y="${
        ringSize / 2 + 5
      }" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${escapeText(
        badge
      )}</text>`
    : "";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
  <circle cx="${ringSize / 2}" cy="${ringSize / 2}" r="${ringSize / 2 - 2}" fill="${color}" stroke="rgba(0,0,0,0.55)" stroke-width="2"/>
  ${inner}
</svg>`.trim();
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toDataUri(svg: string): string {
  // Base64 надёжнее против специальных символов, чем encodeURIComponent.
  if (typeof window === "undefined") {
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString(
      "base64"
    )}`;
  }
  return `data:image/svg+xml;base64,${window.btoa(
    unescape(encodeURIComponent(svg))
  )}`;
}

/**
 * Универсальный компонент карты на 2ГИС MapGL:
 *   - отображение списка маркеров (props.points);
 *   - кликабельные маркеры (onMarkerClick);
 *   - режим выбора точки на карте (props.pin + onMapClick);
 *   - смена темы (light / dark).
 *
 * Реальное API 2ГИС загружается лениво на клиенте (import("@2gis/mapgl")).
 */
export default function Map2GIS({
  points,
  onMarkerClick,
  onMapClick,
  pin,
  center,
  zoom = 13,
  height = "100%",
}: Props) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapGLMap | null>(null);
  const markersRef = useRef<MapGLMarker[]>([]);
  const pinMarkerRef = useRef<MapGLMarker | null>(null);

  // Стабильный массив для пересоздания маркеров (только при изменении набора).
  const pts = useMemo(() => points ?? [], [points]);

  // ─── Инициализация карты ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    if (!containerRef.current) return;
    if (!TWOGIS_KEY) {
      console.warn(
        "[Map2GIS] NEXT_PUBLIC_2GIS_API_KEY не задан — карта не будет инициализирована."
      );
      return;
    }

    loadMapGL().then((mapgl) => {
      if (cancelled || !containerRef.current) return;

      const map = new mapgl.Map(containerRef.current, {
        center: [center?.lng ?? BISHKEK_LNG, center?.lat ?? BISHKEK_LAT],
        zoom,
        key: TWOGIS_KEY,
        // Стиль соответствует светлой/тёмной теме.
        style:
          theme === "dark"
            ? "e05ac437-fcc2-4845-ad74-b1de9ce07555"
            : "c080bb6a-8134-4993-93a1-5b4d8c36a59b",
        zoomControl: true,
      });

      mapRef.current = map;

      if (onMapClick) {
        map.on("click", (e) => {
          const [lng, lat] = e.lngLat;
          onMapClick({ lat, lng });
        });
      }
    });

    return () => {
      cancelled = true;
      // Удаляем маркеры и карту при размонтировании.
      for (const m of markersRef.current) m.destroy();
      markersRef.current = [];
      pinMarkerRef.current?.destroy();
      pinMarkerRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
    // Карта пересоздаётся при смене темы (для смены style)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ─── Маркеры ───────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Удаляем старые маркеры.
    for (const m of markersRef.current) m.destroy();
    markersRef.current = [];

    loadMapGL().then((mapgl) => {
      if (!mapRef.current) return;
      for (const p of pts) {
        const svg = svgMarker(p.color ?? ACCENT, p.badge);
        const size = p.badge ? 44 : 32;
        const marker = new mapgl.Marker(map, {
          coordinates: [p.lng, p.lat],
          icon: toDataUri(svg),
          size: [size, size],
          anchor: [size / 2, size / 2],
        });
        if (onMarkerClick) {
          marker.on("click", () => onMarkerClick(p.id));
        }
        markersRef.current.push(marker);
      }
    });
  }, [pts, onMarkerClick]);

  // ─── Пин (picker-режим) ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (pinMarkerRef.current) {
      pinMarkerRef.current.destroy();
      pinMarkerRef.current = null;
    }
    if (!pin) return;

    loadMapGL().then((mapgl) => {
      if (!mapRef.current) return;
      const svg = svgMarker(ACCENT);
      const marker = new mapgl.Marker(map, {
        coordinates: [pin.lng, pin.lat],
        icon: toDataUri(svg),
        size: [32, 32],
        anchor: [16, 16],
      });
      pinMarkerRef.current = marker;
    });
  }, [pin]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        background: theme === "dark" ? "#1E1E1E" : "#FAFAF5",
      }}
    />
  );
}
