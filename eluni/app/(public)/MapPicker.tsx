"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/lib/theme/ThemeProvider";

const BISHKEK: [number, number] = [42.8746, 74.5698];

// Иконка маркера через div — чтобы не зависеть от leaflet-image-assets.
const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:#4F46E5;
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 24],
});

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
  height?: string;
}

function ClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyTo({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo(to, Math.max(map.getZoom(), 15), { duration: 0.4 });
  }, [to, map]);
  return null;
}

export default function MapPicker({ value, onChange, height = "320px" }: Props) {
  const { theme } = useTheme();
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const bg = theme === "dark" ? "#1E1E1E" : "#FAFAF5";

  return (
    <div
      className="overflow-hidden rounded-xl border border-app"
      style={{ height }}
    >
      <MapContainer
        center={value ? [value.lat, value.lng] : BISHKEK}
        zoom={value ? 15 : 12}
        style={{ height: "100%", width: "100%", background: bg }}
        scrollWheelZoom
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        <ClickHandler
          onClick={(lat, lng) => onChange({ lat, lng })}
        />
        {value && (
          <>
            <Marker position={[value.lat, value.lng]} icon={pinIcon} />
            <FlyTo to={[value.lat, value.lng]} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
