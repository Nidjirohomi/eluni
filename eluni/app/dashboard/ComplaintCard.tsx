"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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

const MiniMap = dynamic(() => import("./Map2GIS"), { ssr: false });

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
  /**
   * Встроенный режим (внутри Drawer). Убирает собственные рамку/фон/крестик —
   * их предоставляет родитель. Используется для правой панели «Инцидент».
   */
  embedded?: boolean;
  onClose: () => void;
  onUpdate: (updated: ComplaintRow) => void;
}

export function ComplaintCard({
  complaint,
  myDisplayName,
  canManage,
  canAct = true,
  embedded = false,
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

  // Содержимое тела карточки (одинаково для embedded и standalone).
  const body = (
    <div className="space-y-5">
      {/* Блок «Инцидент / Категория» — главный заголовок как в макете */}
      <section>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-app">
          {t("topbar.section")}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h3 className="text-xl font-bold leading-tight text-app">
            {complaint.category}
          </h3>
          {complaint.source === "telegram" && !complaint.userId && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-zinc-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-muted-app"
              title="Жалоба подана анонимно через Telegram"
            >
              <EyeOff className="h-3 w-3" />
              {t("complaint.anonymous")}
            </span>
          )}
        </div>
      </section>

      {/* Двухколонная сетка: Статус | Время */}
      <section className="grid grid-cols-2 gap-3">
        <InfoBlock label={t("filters.status")}>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
          </div>
        </InfoBlock>
        <InfoBlock label={t("complaint.time")}>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-app">
            <Clock className="h-3.5 w-3.5 text-muted-app" />
            {new Date(complaint.createdAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </InfoBlock>
        <InfoBlock label={t("priority.label")}>
          <PriorityBadge priority={complaint.priority} />
        </InfoBlock>
        <InfoBlock label={t("complaint.assignee")}>
          <div className="truncate text-sm font-semibold text-app">
            {complaint.assignedUser ?? t("complaint.noAssignee")}
          </div>
        </InfoBlock>
      </section>

      {/* Текст обращения */}
      <section>
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-app">
          {t("complaint.officialText")}
        </div>
        <p className="text-sm leading-relaxed text-app">
          {complaint.officialText}
        </p>
      </section>

      {/* Адрес */}
      {complaint.address && (
        <section className="flex items-start gap-2 text-sm text-muted-app">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="leading-snug">{complaint.address}</span>
        </section>
      )}

      {/* Мини-карта (если есть координаты) */}
      {complaint.lat != null && complaint.lng != null && (
        <section>
          <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-app">
            {t("complaint.map")}
          </div>
          <div className="overflow-hidden rounded-xl border border-app">
            <MiniMap
              points={[
                {
                  id: complaint.id,
                  lat: complaint.lat,
                  lng: complaint.lng,
                  color: "#F97316",
                },
              ]}
              center={{ lat: complaint.lat, lng: complaint.lng }}
              zoom={15}
              height="160px"
            />
          </div>
        </section>
      )}

      {/* Прикреплённые медиа */}
      <MediaGallery media={complaint.mediaUrls} title={t("complaint.media")} />

      {/* ID */}
      <div className="font-mono text-[11px] text-muted-app">
        ID: {complaint.id}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Действия */}
      {canAct && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "pending" && (
            <button
              type="button"
              onClick={take}
              disabled={pending}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent-app px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Wrench className="h-4 w-4" />
              {t("complaint.takeInWork")}
            </button>
          )}
          {isAssignedToMe && (
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("complaint.close")}
            </button>
          )}
          {pending && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-app" />
          )}
        </div>
      )}

      {!canAct && (
        <div className="rounded-lg border border-app bg-surface-2 px-3 py-2 text-xs text-muted-app">
          {t("complaint.readOnlyHint")}
        </div>
      )}

      {/* Назначение для начальника */}
      {canAct && canManage && status !== "resolved" && (
        <div className="rounded-xl border border-app bg-surface-2 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-app">
            <UserPlus className="h-4 w-4" />
            {t("complaint.assignTo")}
          </div>
          {loadingOnDuty ? (
            <div className="text-xs text-muted-app">{t("common.loading")}</div>
          ) : onDuty.length === 0 ? (
            <div className="text-xs text-muted-app">{t("common.noData")}</div>
          ) : (
            <div className="flex flex-col gap-2">
              <select
                value={assignTarget}
                onChange={(e) => setAssignTarget(e.target.value)}
                className="min-h-[40px] rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app"
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
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-accent-app px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {t("complaint.assign")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Embedded режим — без рамки/фона/крестика (их даёт Drawer).
  if (embedded) return body;

  // Standalone — старый формат (на случай использования вне Drawer).
  return (
    <div className="pointer-events-auto w-[420px] max-w-[94vw] overflow-hidden rounded-2xl border border-app bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-app px-5 py-3">
        <div className="text-base font-semibold text-app">
          {t("topbar.section")}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-app transition hover:bg-surface-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-5 py-4">{body}</div>
    </div>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-app bg-surface-2 px-3 py-2.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-app">
        {label}
      </div>
      {children}
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
