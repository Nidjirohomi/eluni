"use client";

import { useState } from "react";
import { Download, Loader2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  org: string;
}

type Period = "weekly" | "monthly";

export function ExportPanel({ org }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState<Period | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(period: Period) {
    setBusy(period);
    setError(null);
    try {
      const res = await fetch(`/api/export?period=${period}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eluni-report-${org}-${period}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-xl border border-app bg-surface-2 p-4">
      <div className="mb-3 flex items-start gap-2">
        <FileSpreadsheet className="mt-0.5 h-4 w-4 flex-shrink-0 accent-app" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-app">{t("export.title")}</div>
          <div className="text-xs text-muted-app">{t("export.subtitle")}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PeriodButton
          label={t("export.weekly")}
          busy={busy === "weekly"}
          disabled={busy !== null}
          onClick={() => download("weekly")}
        />
        <PeriodButton
          label={t("export.monthly")}
          busy={busy === "monthly"}
          disabled={busy !== null}
          onClick={() => download("monthly")}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}

function PeriodButton({
  label,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app transition hover:bg-surface-2 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
