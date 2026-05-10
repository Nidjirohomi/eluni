"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { ComplaintRow } from "./DashboardClient";

// Ленивая инициализация плагина (типы)
type HeatLatLng = [number, number, number];
declare module "leaflet" {
  function heatLayer(
    latlngs: HeatLatLng[],
    options?: Record<string, unknown>
  ): L.Layer;
}

const BISHKEK: [number, number] = [42.8746, 74.5698];

function ageHours(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 1000 / 3600;
}

function colorByAge(hours: number): string {
  if (hours < 1) return "#10b981";
  if (hours < 6) return "#f59e0b";
  if (hours < 24) return "#fb923c";
  return "#ef4444";
}

function makeIcon(color: string, count: number): L.DivIcon {
  const size = count > 1 ? 36 : 28;
  const inner =
    count > 1
      ? `<span style="color:#fff;font-size:13px;font-weight:700;">${count}</span>`
      : "";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2px solid rgba(0,0,0,0.55);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 12px ${color}80;
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
}

export default function ComplaintsMap({ complaints, showHeatmap }: Props) {
  const clusters = useMemo(() => clusterByCoords(complaints), [complaints]);

  const heatPoints: HeatLatLng[] = useMemo(
    () =>
      complaints
        .filter((c) => c.lat !== null && c.lng !== null)
        .map((c) => {
          // вес = приоритет
          const weight =
            c.priority === "Высокий" ? 1 : c.priority === "Средний" ? 0.6 : 0.3;
          return [c.lat as number, c.lng as number, weight];
        }),
    [complaints]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5">
      <MapContainer
        center={BISHKEK}
        zoom={13}
        style={{ height: "460px", width: "100%", background: "#0a0a0a" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {showHeatmap && <HeatmapLayer points={heatPoints} />}

        {clusters.map((cluster) => {
          const newest = cluster.items.reduce((a, b) =>
            new Date(a.createdAt) > new Date(b.createdAt) ? a : b
          );
          const color = colorByAge(ageHours(newest.createdAt));
          return (
            <Marker
              key={cluster.key}
              position={[cluster.lat, cluster.lng]}
              icon={makeIcon(color, cluster.items.length)}
            >
              <Popup>
                <div style={{ minWidth: 220, color: "#111" }}>
                  {cluster.items.length > 1 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        marginBottom: 6,
                      }}
                    >
                      На этой точке: {cluster.items.length} обращений
                    </div>
                  )}
                  {cluster.items.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      style={{
                        marginBottom: 8,
                        paddingBottom: 8,
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          fontSize: 11,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            background: "#eef",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {c.category}
                        </span>
                        <span
                          style={{
                            background: "#fee",
                            padding: "1px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {c.priority}
                        </span>
                      </div>
                      <div style={{ fontSize: 12 }}>{c.officialText}</div>
                      <div
                        style={{ fontSize: 10, color: "#888", marginTop: 4 }}
                      >
                        {new Date(c.createdAt).toLocaleString("ru-RU")}
                      </div>
                    </div>
                  ))}
                  {cluster.items.length > 3 && (
                    <div style={{ fontSize: 11, color: "#666" }}>
                      и ещё {cluster.items.length - 3}…
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
