"use client";

import { useState } from "react";
import { Search, Loader2, AlertCircle, Clock, CheckCircle2, Wrench } from "lucide-react";

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

const STATUS_LABELS: Record<string, { label: string; className: string; Icon: typeof Clock }> = {
  pending: {
    label: "В ожидании",
    className: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    Icon: Clock,
  },
  in_progress: {
    label: "В работе",
    className: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30",
    Icon: Wrench,
  },
  resolved: {
    label: "Решено",
    className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    Icon: CheckCircle2,
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  Средний: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  Низкий: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
};

export default function TrackPage() {
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

  const statusInfo = complaint
    ? STATUS_LABELS[complaint.status] ?? {
        label: complaint.status,
        className: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
        Icon: Clock,
      }
    : null;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Отслеживание обращения
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Введите ID, который вы получили после отправки жалобы.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:flex-row"
      >
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Например: clx9k2m3b0001abcd..."
          className="flex-1 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          required
        />
        <button
          type="submit"
          disabled={loading || !id.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Поиск...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Проверить
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {complaint && statusInfo && (
        <section className="space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${statusInfo.className}`}
            >
              <statusInfo.Icon className="h-3.5 w-3.5" />
              {statusInfo.label}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                PRIORITY_STYLES[complaint.priority] ??
                "bg-zinc-500/15 text-zinc-300"
              }`}
            >
              {complaint.priority} приоритет
            </span>
            <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-xs text-zinc-400">
              {complaint.id}
            </span>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Категория" value={complaint.category} />
            <Field label="Госорган" value={complaint.assignedTo} />
            {complaint.address && (
              <Field label="Адрес" value={complaint.address} />
            )}
            <Field
              label="Создано"
              value={new Date(complaint.createdAt).toLocaleString("ru-RU")}
            />
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              Официальная формулировка
            </div>
            <p className="rounded-xl border border-white/5 bg-black/30 p-4 text-sm leading-relaxed text-zinc-200">
              {complaint.officialText}
            </p>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              Исходный текст
            </div>
            <p className="rounded-xl border border-white/5 bg-black/30 p-4 text-sm leading-relaxed text-zinc-400">
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
    <div className="rounded-xl border border-white/5 bg-black/30 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-white">{value}</div>
    </div>
  );
}
