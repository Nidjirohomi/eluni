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
} from "lucide-react";
import type { ComplaintRow, OnDutyUser } from "./types";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  complaint: ComplaintRow;
  myDisplayName: string;
  canManage: boolean;
  onClose: () => void;
  onUpdate: (updated: ComplaintRow) => void;
}

export function ComplaintCard({
  complaint,
  myDisplayName,
  canManage,
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
    if (!canManage) return;
    setLoadingOnDuty(true);
    fetch("/api/users/on-duty")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.users)) setOnDuty(d.users);
      })
      .catch(() => {})
      .finally(() => setLoadingOnDuty(false));
  }, [canManage]);

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
    <div className="pointer-events-auto w-[420px] max-w-[92vw] overflow-hidden rounded-2xl border border-app bg-surface shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-app px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusBadge status={status} />
          <PriorityBadge priority={complaint.priority} />
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-app">
            {complaint.category}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-app transition hover:bg-surface-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-app">
          {complaint.officialText}
        </p>
        {complaint.address && (
          <div className="flex items-center gap-1.5 text-xs text-muted-app">
            <MapPin className="h-3.5 w-3.5" />
            {complaint.address}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-app">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(complaint.createdAt).toLocaleString("ru-RU")}
          </span>
          <span>
            {t("complaint.assignee")}:{" "}
            <span className="text-app">
              {complaint.assignedUser ?? t("complaint.noAssignee")}
            </span>
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-app">
          ID: {complaint.id}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {status === "pending" && (
            <button
              type="button"
              onClick={take}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-app px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Wrench className="h-3.5 w-3.5" />
              {t("complaint.takeInWork")}
            </button>
          )}
          {isAssignedToMe && (
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("complaint.close")}
            </button>
          )}
          {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-app" />}
        </div>

        {canManage && status !== "resolved" && (
          <div className="rounded-xl border border-app bg-surface-2 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-app">
              <UserPlus className="h-3.5 w-3.5" />
              {t("complaint.assignTo")}
            </div>
            {loadingOnDuty ? (
              <div className="text-xs text-muted-app">{t("common.loading")}</div>
            ) : onDuty.length === 0 ? (
              <div className="text-xs text-muted-app">{t("common.noData")}</div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="flex-1 rounded-md border border-app bg-surface px-2 py-1.5 text-xs text-app"
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
                  className="inline-flex items-center gap-1 rounded-md bg-accent-app px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
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
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
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
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        styles[priority] ?? "bg-zinc-500/15"
      }`}
    >
      {priority}
    </span>
  );
}
