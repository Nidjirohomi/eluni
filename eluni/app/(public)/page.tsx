"use client";

import { useState } from "react";
import {
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

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
  Высокий: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  Средний: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  Низкий: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
};

export default function HomePage() {
  const [text, setText] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplaintResponse | null>(null);
  const [copied, setCopied] = useState(false);

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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось отправить обращение."
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

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Сообщите о городской проблеме
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          AI-классификатор автоматически определит категорию, приоритет и
          направит ваше обращение в нужный государственный орган.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-white/5 bg-white/[0.02] p-6"
      >
        <div>
          <label
            htmlFor="text"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Опишите проблему
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Например: на улице Киевской возле дома 32 уже третий день не вывозят мусор, появились крысы..."
            rows={6}
            className="w-full resize-none rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Адрес <span className="text-zinc-500">(необязательно)</span>
          </label>
          <input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="ул. Киевская 32, Бишкек"
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-500">
            Не используйте персональные данные третьих лиц.
          </p>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Отправить
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {result && (
        <section className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Обращение принято</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Сохраните ID, чтобы отслеживать статус.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Категория" value={result.category} />
            <Field
              label="Приоритет"
              value={
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    PRIORITY_STYLES[result.priority] ??
                    "bg-zinc-500/15 text-zinc-300"
                  }`}
                >
                  {result.priority}
                </span>
              }
            />
            <Field label="Госорган" value={result.assignedTo} />
            <Field
              label="ID для отслеживания"
              value={
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-white hover:bg-white/10"
                >
                  {result.id}
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              }
            />
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
              Официальная формулировка
            </div>
            <p className="rounded-xl border border-white/5 bg-black/30 p-4 text-sm leading-relaxed text-zinc-200">
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
    <div className="rounded-xl border border-white/5 bg-black/30 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-white">{value}</div>
    </div>
  );
}
