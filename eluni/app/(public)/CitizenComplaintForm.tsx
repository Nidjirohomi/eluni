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
  Paperclip,
  X,
  MapPin,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { reverseGeocode } from "@/lib/twogis";
import {
  AddressAutocomplete,
  shortenAddress,
  type AddressSuggestion,
} from "./AddressAutocomplete";

const MapPicker = dynamic(() => import("./MapPicker2GIS"), {
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

/**
 * Форма подачи жалобы — доступна ТОЛЬКО верифицированным гражданам.
 * Если пользователь не залогинен, родительский серверный компонент
 * рендерит вместо неё заглушку с предложением войти через Түндүк / Telegram.
 */
export function CitizenComplaintForm() {
  const { t } = useI18n();

  const [text, setText] = useState("");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const MAX_FILES = 6;
  const MAX_BYTES = 25 * 1024 * 1024;

  const [addressExternalTick, setAddressExternalTick] = useState(0);
  const bumpExternal = () => setAddressExternalTick((v) => v + 1);

  const reverseAbort = useRef<AbortController | null>(null);

  // Адрес обязателен: либо введён текстом, либо проставлена точка на карте.
  const hasAddress = !!(address && address.trim()) || !!point;
  const canSubmit = !!text.trim() && hasAddress && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      let res: Response;
      if (files.length > 0) {
        const fd = new FormData();
        fd.set("text", text.trim());
        if (address.trim()) fd.set("address", address.trim());
        if (point) {
          fd.set("lat", String(point.lat));
          fd.set("lng", String(point.lng));
        }
        fd.set("source", "web");
        for (const f of files) fd.append("files", f);
        res = await fetch("/api/complaints", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/complaints", {
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
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setResult(data as ComplaintResponse);
      setText("");
      setAddress("");
      setPoint(null);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      bumpExternal();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
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

  async function handleMapPick(p: { lat: number; lng: number }) {
    setPoint(p);
    bumpExternal();

    reverseAbort.current?.abort();
    const ctrl = new AbortController();
    reverseAbort.current = ctrl;

    try {
      const full = await reverseGeocode(p.lat, p.lng, { signal: ctrl.signal });
      if (full) {
        setAddress(shortenAddress(full));
        bumpExternal();
      }
    } catch {
      /* ignore */
    }
  }

  function handleAddressPick(s: AddressSuggestion) {
    setAddress(s.display_name);
    setPoint({ lat: s.lat, lng: s.lon });
    bumpExternal();
  }

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const accepted = picked
      .filter((f) => /^(image|video)\//i.test(f.type))
      .filter((f) => f.size > 0 && f.size <= MAX_BYTES);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of accepted) {
        if (next.length >= MAX_FILES) break;
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
    if (e.target) e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
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
            {t("public.location")} <span className="text-red-500">*</span>
          </label>

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

          {!hasAddress && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
              <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Укажите адрес: введите его в поле выше или поставьте точку на
                карте.
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-app">
            {t("public.attachments")}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_FILES}
              className="inline-flex items-center gap-1.5 rounded-xl border border-app bg-surface-2 px-3 py-2 text-xs font-medium text-app transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {t("public.attach")}
            </button>
            <span className="text-[11px] text-muted-app">
              {files.length} / {MAX_FILES} · {t("public.attachHint")}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFilesChange}
            className="hidden"
          />
          {files.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${f.size}-${i}`}
                  className="relative overflow-hidden rounded-lg border border-app bg-surface-2"
                >
                  {f.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center text-xs text-muted-app">
                      🎬 {f.name}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75"
                    title={t("common.remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-app">{t("public.warning")}</p>
          <button
            type="submit"
            disabled={!canSubmit}
            title={!hasAddress ? "Укажите адрес на карте" : undefined}
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
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result && (
        <section className="mt-6 space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
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
    </>
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
