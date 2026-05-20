"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { searchPlaces } from "@/lib/twogis";

export interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
}

/**
 * Сокращает full_name из 2ГИС: убирает страну в конце (на случай если 2ГИС
 * её добавляет в локализации) и пробельный мусор. Совместим со старым именем.
 */
export function shortenAddress(s: string): string {
  if (!s) return s;
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  while (parts.length > 0) {
    const tail = parts[parts.length - 1].toLowerCase();
    if (
      /^кыргызстан$/i.test(tail) ||
      /^kyrgyzstan$/i.test(tail) ||
      /^kg$/i.test(tail)
    ) {
      parts.pop();
      continue;
    }
    break;
  }
  return parts.join(", ");
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: AddressSuggestion) => void;
  placeholder?: string;
  /** Подсказка снаружи — внешний адрес меняется reverse-geocoder'ом и не должен триггерить выпадашку. */
  externalChange?: number;
}

/**
 * Поле ввода адреса с автодополнением через Nominatim.
 * При выборе подсказки вызывает onPick({lat,lon,display_name}).
 *
 * Особенности:
 *   - debounce 350 мс
 *   - запросы только при фокусе и >=3 символах
 *   - запрос ограничен Кыргызстаном (countrycodes=kg) для релевантности
 *   - externalChange используется, чтобы отличить программную смену значения
 *     (после клика по карте) от пользовательского ввода — иначе после reverse-geocode
 *     выпадашка опять появится без надобности.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  externalChange,
}: Props) {
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lastExternal = useRef(externalChange);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Скрываем выпадашку при клике вне.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Если внешний код поменял value (reverse geocode после клика по карте) —
  // не показываем выпадашку и сбрасываем «не найдено».
  useEffect(() => {
    if (externalChange !== lastExternal.current) {
      lastExternal.current = externalChange;
      setOpen(false);
      setItems([]);
      setNotFound(false);
    }
  }, [externalChange]);

  // Debounced search.
  useEffect(() => {
    if (!focused) return;
    const q = value.trim();
    if (q.length < 3) {
      setItems([]);
      setOpen(false);
      setNotFound(false);
      return;
    }

    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const results = await searchPlaces(q, {
          signal: ctrl.signal,
          limit: 5,
        });
        const parsed: AddressSuggestion[] = results.map((d) => ({
          display_name: shortenAddress(d.fullName || d.name),
          lat: d.lat,
          lon: d.lng,
        }));
        setItems(parsed);
        setOpen(true); // открываем дропдаун, чтобы показать «не найдено»
        setNotFound(parsed.length === 0);
      } catch (err) {
        // если abort — игнорируем
        if ((err as { name?: string })?.name === "AbortError") return;
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [value, focused]);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder ?? "ул. Киевская 32, Бишкек"}
          className="w-full rounded-xl border border-app bg-surface-2 px-4 py-3 pr-9 text-sm text-app placeholder:text-muted-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-app">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
      </div>

      {open && (items.length > 0 || notFound) && (
        <div
          className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-auto rounded-xl border border-app bg-surface shadow-lg"
          style={{ zIndex: 1000 }}
        >
          {items.length > 0 ? (
            <ul>
              {items.map((it, i) => (
                <li key={`${it.lat},${it.lon},${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      // mousedown — чтобы успеть отработать до blur инпута
                      e.preventDefault();
                      onPick(it);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-app transition hover:bg-surface-2"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-app" />
                    <span className="line-clamp-2">{it.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-app">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span>Адрес не найден</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
