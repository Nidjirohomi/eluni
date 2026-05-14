"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle, Clock, CheckCircle2, Wrench } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Complaint {
  id: string;
  originalText: string;
  officialText: string;
  category: string;
  priority: string;
  assignedTo: string;
  status: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<string, { className: string; Icon: typeof Clock }> = {
  pending: {
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
    Icon: Clock,
  },
  in_progress: {
    className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 ring-indigo-500/30",
    Icon: Wrench,
  },
  resolved: {
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
    Icon: CheckCircle2,
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-600 dark:text-red-300 ring-1 ring-red-500/30",
  Средний: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-1 ring-amber-500/30",
  Низкий: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-500/30",
};

export default function TrackPage() {
  const { t } = useI18n();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complaint, setComplaint] = useState<Complaint | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setComplaint(null);

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setComplaint(data as Complaint);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось получить данные."
      );
    } finally {
      setLoading(false);
    }
  }

  const statusMeta = complaint
    ? STATUS_META[complaint.status] ?? {
        className: "bg-zinc-500/15 ring-zinc-500/30",
        Icon: Clock,
      }
    : null;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-app sm:text-4xl">
          {t("public.track")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-app">
          ID, {t("common.of")} {t("public.successHint")}
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-app bg-surface p-6 sm:flex-row"
      >
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="clx9k2m3b0001abcd..."
          className="flex-1 rounded-xl border border-app bg-surface-2 px-4 py-3 font-mono text-sm text-app placeholder:text-muted-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          required
        />
        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-app px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              {t("public.track")}
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {complaint && statusMeta && (
        <section className="space-y-5 rounded-2xl border border-app bg-surface p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${statusMeta.className}`}
            >
              <statusMeta.Icon className="h-3.5 w-3.5" />
              {t(`status.${complaint.status}`)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                PRIORITY_STYLES[complaint.priority] ?? "bg-zinc-500/15"
              }`}
            >
              {complaint.priority}
            </span>
            <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted-app">
              {complaint.id}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label={t("complaint.category")} value={complaint.category} />
            <Field label={t("complaint.assignee")} value={complaint.assignedTo} />
            {complaint.address && (
              <Field label={t("complaint.address")} value={complaint.address} />
            )}
            <Field
              label={t("complaint.createdAt")}
              value={new Date(complaint.createdAt).toLocaleString("ru-RU")}
            />
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-app">
              {t("complaint.officialText")}
            </div>
            <p className="rounded-xl border border-app bg-surface-2 p-4 text-sm leading-relaxed text-app">
              {complaint.officialText}
            </p>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-app">
              {t("complaint.originalText")}
            </div>
            <p className="rounded-xl border border-app bg-surface-2 p-4 text-sm leading-relaxed text-muted-app">
              {complaint.originalText}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-app bg-surface-2 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-app">
        {label}
      </div>
      <div className="mt-1 text-app">{value}</div>
    </div>
  );
}
