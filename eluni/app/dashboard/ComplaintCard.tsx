"use client";

import { useEffect, useState } from "react";
import {
  X,
  MapPin,
  Wrench,
  UserPlus,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  EyeOff,
} from "lucide-react";
import type { ComplaintRow, OnDutyUser } from "./types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { MediaGallery } from "./MediaGallery";

interface Props {
  complaint: ComplaintRow;
  myDisplayName: string;
  /** Может ли пользователь назначать жалобы (начальник). */
  canManage: boolean;
  /**
   * Может ли пользователь выполнять действия над жалобой
   * (взять в работу, закрыть). У супер-админа = false.
   * По умолчанию true для обратной совместимости.
   */
  canAct?: boolean;
  onClose: () => void;
  onUpdate: (updated: ComplaintRow) => void;
}

export function ComplaintCard({
  complaint,
  myDisplayName,
  canManage,
  canAct = true,
  onClose,
  onUpdate,
}: Props) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onDuty, setOnDuty] = useState<OnDutyUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<string>("");
  const [loadingOnDuty, setLoadingOnDuty] = useState(false);

  useEffect(() => {
    if (!canManage || !canAct) return;
    setLoadingOnDuty(true);
    fetch("/api/users/on-duty")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.users)) setOnDuty(d.users);
      })
      .catch(() => {})
      .finally(() => setLoadingOnDuty(false));
  }, [canManage, canAct]);

  async function take() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/take`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onUpdate({
        ...complaint,
        status: data.status,
        assignedUser: data.assignedUser,
        updatedAt: data.updatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function assign() {
    if (!assignTarget) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: assignTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onUpdate({
        ...complaint,
        status: data.status,
        assignedUser: data.assignedUser,
        updatedAt: data.updatedAt,
      });
      setAssignTarget("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function close() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      onUpdate({
        ...complaint,
        status: data.status,
        assignedUser: data.assignedUser ?? complaint.assignedUser,
        updatedAt: data.updatedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(false);
    }
  }

  const status = complaint.status;
  const isAssignedToMe =
    status === "in_progress" && complaint.assignedUser === myDisplayName;

  return (
    <div className="pointer-events-auto w-[480px] max-w-[94vw] overflow-hidden rounded-2xl border border-app bg-surface shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-app px-6 py-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={status} />
          <PriorityBadge priority={complaint.priority} />
          <span className="rounded-md bg-surface-2 px-2.5 py-1 font-semibold text-app">
            {complaint.category}
          </span>
          {/* Метка «Анонимно» — жалоба пришла из Telegram без привязки к гражданину. */}
          {complaint.source === "telegram" && !complaint.userId && (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-500/15 px-2.5 py-1 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
              title="Жалоба подана анонимно через Telegram"
            >
              <EyeOff className="h-4 w-4" />
              {t("complaint.anonymous")}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-app transition hover:bg-surface-2"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4 px-6 py-5">
        <p className="text-base leading-relaxed text-app">
          {complaint.officialText}
        </p>
        {complaint.address && (
          <div className="flex items-center gap-2 text-sm text-muted-app">
            <MapPin className="h-4 w-4" />
            {complaint.address}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-app">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {new Date(complaint.createdAt).toLocaleString("ru-RU")}
          </span>
          <span>
            {t("complaint.assignee")}:{" "}
            <span className="font-medium text-app">
              {complaint.assignedUser ?? t("complaint.noAssignee")}
            </span>
          </span>
        </div>
        <div className="font-mono text-xs text-muted-app">
          ID: {complaint.id}
        </div>

        {/* Прикреплённые фото/видео */}
        <MediaGallery media={complaint.mediaUrls} title={t("complaint.media")} />

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {canAct && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {status === "pending" && (
              <button
                type="button"
                onClick={take}
                disabled={pending}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-accent-app px-5 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:min-h-[44px]"
              >
                <Wrench className="h-5 w-5" />
                {t("complaint.takeInWork")}
              </button>
            )}
            {isAssignedToMe && (
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 sm:min-h-[44px]"
              >
                <CheckCircle2 className="h-5 w-5" />
                {t("complaint.close")}
              </button>
            )}
            {pending && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-app" />
            )}
          </div>
        )}

        {!canAct && (
          <div className="rounded-lg border border-app bg-surface-2 px-4 py-3 text-sm text-muted-app">
            {t("complaint.readOnlyHint")}
          </div>
        )}

        {canAct && canManage && status !== "resolved" && (
          <div className="rounded-xl border border-app bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-app">
              <UserPlus className="h-5 w-5" />
              {t("complaint.assignTo")}
            </div>
            {loadingOnDuty ? (
              <div className="text-sm text-muted-app">{t("common.loading")}</div>
            ) : onDuty.length === 0 ? (
              <div className="text-sm text-muted-app">{t("common.noData")}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="min-h-[48px] flex-1 rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app sm:min-h-[44px]"
                >
                  <option value="">— {t("common.all")} —</option>
                  {onDuty.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.username})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={assign}
                  disabled={!assignTarget || pending}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-accent-app px-5 py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:min-h-[44px]"
                >
                  {t("complaint.assign")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    in_progress: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-sm font-semibold ${
        styles[status] ?? "bg-zinc-500/15"
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    Высокий: "bg-red-500/15 text-red-600 dark:text-red-300",
    Средний: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    Низкий: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-sm font-semibold ${
        styles[priority] ?? "bg-zinc-500/15"
      }`}
    >
      {priority}
    </span>
  );
}
