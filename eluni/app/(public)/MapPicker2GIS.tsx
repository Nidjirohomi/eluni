"use client";

import Map2GIS from "@/app/dashboard/Map2GIS";

interface Props {
  value: { lat: number; lng: number } | null;
  onChange: (p: { lat: number; lng: number }) => void;
  height?: string;
}

/**
 * Поле выбора точки на карте 2ГИС. Совместим по API с предыдущим Leaflet-MapPicker.
 * При клике по карте — вызывает onChange с координатами.
 */
export default function MapPicker2GIS({ value, onChange, height = "320px" }: Props) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-app"
      style={{ height }}
    >
      <Map2GIS
        pin={value}
        onMapClick={onChange}
        center={value ?? undefined}
        zoom={value ? 15 : 12}
        height="100%"
      />
    </div>
  );
}
