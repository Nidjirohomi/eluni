"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Fingerprint,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  AddressAutocomplete,
  type AddressSuggestion,
} from "./AddressAutocomplete";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-app bg-surface text-sm text-muted-app">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    </div>
  ),
});

interface ComplaintResponse {
  id: string;
  category: string;
  priority: string;
  assignedTo: string;
  officialText: string;
  originalText: string;
  status: string;
  address: string | null;
  createdAt: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-600 dark:text-red-300",
  Средний: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  Низкий: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

export default function HomePage() {
  const { t } = useI18n();

  const [text, setText] = useState("");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Счётчик «программных» смен адреса (после клика по карте / выбора подсказки).
  // Передаётся в AddressAutocomplete, чтобы тот не открывал выпадашку.
  const [addressExternalTick, setAddressExternalTick] = useState(0);
  const bumpExternal = () => setAddressExternalTick((v) => v + 1);

  // Запросы reverse-geocode дебаунсим через ref, чтобы не дёргать Nominatim
  // на каждый микро-клик и отменять предыдущие при новом клике.
  const reverseAbort = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          address: address.trim() || null,
          lat: point?.lat ?? null,
          lng: point?.lng ?? null,
          source: "web",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setResult(data as ComplaintResponse);
      setText("");
      setAddress("");
      setPoint(null);
      bumpExternal();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.network")
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyId() {
    if (!result) return;
    await navigator.clipboard.writeText(result.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Клик по карте → ставим точку, **сразу** запускаем reverse-geocode
  // и автоматически записываем результат в поле адреса.
  async function handleMapPick(p: { lat: number; lng: number }) {
    setPoint(p);
    bumpExternal();

    // Отменяем предыдущий запрос, если был.
    reverseAbort.current?.abort();
    const ctrl = new AbortController();
    reverseAbort.current = ctrl;

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.lat}&lon=${p.lng}&accept-language=ru`,
        { signal: ctrl.signal }
      );
      const data = await r.json();
      if (data?.display_name) {
        setAddress(String(data.display_name));
        bumpExternal();
      }
    } catch {
      // молча игнорируем — пользователь может ввести вручную
    }
  }

  // Выбор подсказки в автодополнении → ставим точку на карте + адрес.
  function handleAddressPick(s: AddressSuggestion) {
    setAddress(s.display_name);
    setPoint({ lat: s.lat, lng: s.lon });
    bumpExternal();
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("public.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-app">{t("public.subtitle")}</p>
      </section>

      {/* Заглушка «Войти через Түндүк» — для граждан, не для госслужащих. */}
      <button
        type="button"
        disabled
        title={t("public.tundukSoon")}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-app bg-surface px-5 py-3 text-sm font-medium text-app opacity-60 transition disabled:cursor-not-allowed sm:w-auto"
      >
        <Fingerprint className="h-4 w-4" />
        {t("public.tundukButton")}
        <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-app">
          {t("public.tundukSoon")}
        </span>
      </button>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-app bg-surface p-6"
      >
        <div>
          <label
            htmlFor="text"
            className="mb-2 block text-sm font-medium text-app"
          >
            {t("public.describe")}
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Например: на улице Киевской возле дома 32 уже третий день не вывозят мусор..."
            rows={6}
            className="w-full resize-none rounded-xl border border-app bg-surface-2 px-4 py-3 text-sm text-app placeholder:text-muted-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-app">
            {t("public.location")}
          </label>

          {/* Поле адреса с автодополнением — сверху над картой,
              чтобы пользователь мог либо ввести/выбрать адрес, либо тыкнуть точкой. */}
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onPick={handleAddressPick}
            externalChange={addressExternalTick}
          />

          <div className="mt-3">
            <MapPicker value={point} onChange={handleMapPick} />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-app">
            <span>{t("public.locationHint")}</span>
            {point && (
              <span className="font-mono">
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-app">{t("public.warning")}</p>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-app px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("public.processing")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("public.send")}
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result && (
        <section className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-app">
                {t("public.successTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-app">
                {t("public.successHint")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label={t("complaint.category")} value={result.category} />
            <Field
              label={t("priority.label")}
              value={
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    PRIORITY_STYLES[result.priority] ?? "bg-zinc-500/15"
                  }`}
                >
                  {result.priority}
                </span>
              }
            />
            <Field label={t("complaint.assignee")} value={result.assignedTo} />
            <Field
              label={t("complaint.id")}
              value={
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-app hover:opacity-80"
                >
                  {result.id}
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              }
            />
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-app">
              {t("complaint.officialText")}
            </div>
            <p className="rounded-xl border border-app bg-surface p-4 text-sm leading-relaxed text-app">
              {result.officialText}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-app bg-surface px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-app">
        {label}
      </div>
      <div className="mt-1 text-app">{value}</div>
    </div>
  );
}
