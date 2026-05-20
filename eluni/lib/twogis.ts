/**
 * Лёгкая обёртка над публичным 2GIS Catalog API.
 *
 * Используется и для прямого поиска (autocomplete), и для обратного
 * геокодинга (координаты → адрес). API-ключ берётся из
 * `NEXT_PUBLIC_2GIS_API_KEY` — он публичный (его можно встроить в фронт).
 *
 * Демо-режим API имеет ограничение 600 запр/мин и 1000/мес — поэтому
 * консьюмеры должны применять debounce/abort, чтобы не превышать его.
 */

export const TWOGIS_KEY = process.env.NEXT_PUBLIC_2GIS_API_KEY ?? "";

/** Бишкек: координаты для приоритета поиска. */
export const BISHKEK_LNG = 74.5698;
export const BISHKEK_LAT = 42.8746;

export interface TwoGisSuggestion {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
}

interface CatalogItem {
  id?: string;
  name?: string;
  full_name?: string;
  address_name?: string;
  point?: { lat: number; lon: number };
}

interface CatalogResponse {
  result?: { items?: CatalogItem[] };
}

function mapItem(it: CatalogItem): TwoGisSuggestion | null {
  if (!it?.point || typeof it.point.lat !== "number") return null;
  return {
    id: it.id ?? `${it.point.lat},${it.point.lon}`,
    name: it.name ?? "",
    fullName: it.full_name ?? it.address_name ?? it.name ?? "",
    lat: it.point.lat,
    lng: it.point.lon,
  };
}

/** Прямой поиск (forward geocoding / search-as-you-type). */
export async function searchPlaces(
  query: string,
  opts: { signal?: AbortSignal; limit?: number } = {}
): Promise<TwoGisSuggestion[]> {
  const q = query.trim();
  if (!TWOGIS_KEY || q.length < 2) return [];

  const url = new URL("https://catalog.api.2gis.com/3.0/items");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "building,attraction,branch,adm_div.street");
  url.searchParams.set(
    "fields",
    "items.point,items.full_name,items.address_name"
  );
  url.searchParams.set("location", `${BISHKEK_LNG},${BISHKEK_LAT}`);
  url.searchParams.set("radius", "30000");
  url.searchParams.set("locale", "ru_KG");
  url.searchParams.set("page_size", String(opts.limit ?? 8));
  url.searchParams.set("key", TWOGIS_KEY);

  try {
    const res = await fetch(url.toString(), { signal: opts.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as CatalogResponse;
    const items = data?.result?.items ?? [];
    return items
      .map(mapItem)
      .filter((x): x is TwoGisSuggestion => !!x);
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return [];
    return [];
  }
}

/** Обратный геокодинг — координаты → читаемый адрес. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  opts: { signal?: AbortSignal } = {}
): Promise<string | null> {
  if (!TWOGIS_KEY) return null;

  const url = new URL("https://catalog.api.2gis.com/3.0/items/geocode");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set(
    "fields",
    "items.point,items.full_name,items.address_name"
  );
  url.searchParams.set("locale", "ru_KG");
  url.searchParams.set("key", TWOGIS_KEY);

  try {
    const res = await fetch(url.toString(), { signal: opts.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as CatalogResponse;
    const first = data?.result?.items?.[0];
    if (!first) return null;
    return first.full_name ?? first.address_name ?? first.name ?? null;
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return null;
    return null;
  }
}
