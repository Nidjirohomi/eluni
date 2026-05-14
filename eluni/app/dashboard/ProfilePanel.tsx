"use client";

import { User, Play, Square, LogOut, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Props {
  user: {
    displayName: string;
    username: string;
    role: string;
    org: string;
  };
  duty: "on_duty" | "off_duty";
  dutyPending: boolean;
  onToggleDuty: () => void;
}

export function ProfilePanel({ user, duty, dutyPending, onToggleDuty }: Props) {
  const { t } = useI18n();
  const onShift = duty === "on_duty";

  return (
    <div className="space-y-5">
      {/* Карточка с именем / ролью */}
      <section className="rounded-xl border border-app bg-surface-2 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-app text-white">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-app">
              {user.displayName}
            </div>
            <div className="truncate text-xs text-muted-app">
              @{user.username}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              onShift
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-zinc-500/15 text-muted-app"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                onShift ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {onShift ? t("duty.on") : t("duty.off")}
          </span>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <Row label={t("settings.org")} value={user.org} />
          <Row label={t("settings.role")} value={user.role} />
        </div>
      </section>

      {/* Действия: смена + выход */}
      <section className="space-y-2">
        <button
          type="button"
          onClick={onToggleDuty}
          disabled={dutyPending}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${
            onShift
              ? "bg-zinc-500/10 text-app hover:bg-zinc-500/20 border border-app"
              : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {dutyPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : onShift ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {onShift ? t("toolbar.endDuty") : t("toolbar.startDuty")}
        </button>

        <a
          href="/api/auth/logout"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500 transition hover:bg-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          {t("toolbar.logout")}
        </a>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-app">{label}</span>
      <span className="text-app">{value}</span>
    </div>
  );
}
