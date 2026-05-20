"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  Pencil,
  X,
  Check,
  Clock,
  MapPin,
  Inbox,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface MyComplaint {
  id: string;
  originalText: string;
  officialText: string;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  mediaUrls: string[] | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  in_progress: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-600 dark:text-red-300",
  Средний: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  Низкий: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
};

export function MyComplaintsClient({
  displayName,
}: {
  displayName: string;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<MyComplaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editAddress, setEditAddress] = useState("");

  async function reload() {
    try {
      const r = await fetch("/api/my/complaints");
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.unknown"));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withdraw(id: string) {
    if (!confirm(t("public.withdrawConfirm"))) return;
    setPendingId(id);
    setError(null);
    try {
      const r = await fetch(`/api/my/complaints/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${r.status}`);
      }
      setItems((prev) => (prev ?? []).filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.unknown"));
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(c: MyComplaint) {
    if (c.status !== "pending") return;
    setEditingId(c.id);
    setEditText(c.originalText);
    setEditAddress(c.address ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditAddress("");
  }

  async function saveEdit(id: string) {
    setPendingId(id);
    setError(null);
    try {
      const r = await fetch(`/api/my/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editText.trim(),
          address: editAddress.trim() || null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
      setItems((prev) =>
        (prev ?? []).map((c) => (c.id === id ? { ...c, ...data } : c))
      );
      cancelEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.unknown"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("public.myComplaints")}
        </h1>
        <p className="mt-2 text-sm text-muted-app">
          {displayName} · {t("public.myComplaints")}
        </p>
      </section>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {items === null && (
        <div className="flex items-center gap-2 text-sm text-muted-app">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-app bg-surface px-6 py-16 text-sm text-muted-app">
          <Inbox className="h-8 w-8 text-muted-app" />
          {t("public.noMyComplaints")}
        </div>
      )}

      {items !== null && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((c) => {
            const isEditing = editingId === c.id;
            const editable = c.status === "pending";
            const busy = pendingId === c.id;
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-app bg-surface p-5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded-md px-2 py-0.5 font-medium ${
                      STATUS_STYLES[c.status] ?? "bg-zinc-500/15"
                    }`}
                  >
                    {t(`status.${c.status}`)}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 font-medium ${
                      PRIORITY_STYLES[c.priority] ?? "bg-zinc-500/15"
                    }`}
                  >
                    {c.priority}
                  </span>
                  <span className="rounded-md bg-surface-2 px-2 py-0.5 text-app">
                    {c.category}
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-muted-app">
                    <Clock className="h-3 w-3" />
                    {new Date(c.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {isEditing ? (
                    <>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-app bg-surface-2 px-3 py-2 text-sm text-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder={t("complaint.address")}
                        className="w-full rounded-xl border border-app bg-surface-2 px-3 py-2 text-sm text-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed text-app">
                        {c.officialText}
                      </p>
                      {c.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-app">
                          <MapPin className="h-3.5 w-3.5" />
                          {c.address}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!isEditing && editable && (
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-app bg-surface-2 px-3 py-1.5 text-xs font-medium text-app transition hover:bg-surface disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t("public.edit")}
                    </button>
                  )}
                  {!isEditing && editable && (
                    <button
                      type="button"
                      onClick={() => withdraw(c.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("public.withdraw")}
                    </button>
                  )}
                  {!isEditing && !editable && (
                    <span className="text-xs text-muted-app">
                      {t("public.editOnlyPending")}
                    </span>
                  )}
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(c.id)}
                        disabled={busy || !editText.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-app px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {t("public.save")}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-app bg-surface-2 px-3 py-1.5 text-xs font-medium text-app transition hover:bg-surface disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("public.cancelEdit")}
                      </button>
                    </>
                  )}
                </div>

                {/* Прикреплённые медиа — миниатюрно. */}
                {c.mediaUrls && c.mediaUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {c.mediaUrls.map((url, i) => {
                      const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(url);
                      return (
                        <a
                          key={`${url}-${i}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-app bg-surface-2"
                        >
                          {isVideo ? (
                            <div className="flex h-20 w-full items-center justify-center text-xs text-muted-app">
                              🎬
                            </div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt=""
                              className="h-20 w-full object-cover"
                            />
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
