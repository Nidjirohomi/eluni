"use client";

import { useEffect, useState } from "react";
import {
  User,
  Play,
  Square,
  LogOut,
  Loader2,
  Send,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface BindInfo {
  bindToken: string | null;
  telegramBound: boolean;
  botUsername: string;
}

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
  /** Скрыть переключатель смены (для супер-админа). */
  hideDuty?: boolean;
}

export function ProfilePanel({
  user,
  duty,
  dutyPending,
  onToggleDuty,
  hideDuty,
}: Props) {
  const { t } = useI18n();
  const onShift = duty === "on_duty";

  return (
    <div className="space-y-5">
      {/* Карточка с именем / ролью */}
      <section className="rounded-xl border border-app bg-surface-2 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-app text-white">
            <User className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold text-app">
              {user.displayName}
            </div>
            <div className="truncate text-sm text-muted-app">
              @{user.username}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
              onShift
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-zinc-500/15 text-muted-app"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                onShift ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            {onShift ? t("duty.on") : t("duty.off")}
          </span>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Row label={t("settings.org")} value={user.org} />
          <Row label={t("settings.role")} value={user.role} />
        </div>
      </section>

      {/* Привязка Telegram — только для госслужащих. */}
      <TelegramBindSection />

      {/* Действия: смена + выход */}
      <section className="space-y-2.5">
        {!hideDuty && (
          <button
            type="button"
            onClick={onToggleDuty}
            disabled={dutyPending}
            className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition disabled:opacity-50 ${
              onShift
                ? "bg-zinc-500/10 text-app hover:bg-zinc-500/20 border border-app"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            }`}
          >
            {dutyPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : onShift ? (
              <Square className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
            {onShift ? t("toolbar.endDuty") : t("toolbar.startDuty")}
          </button>
        )}

        <a
          href="/api/auth/logout"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-base font-semibold text-red-500 transition hover:bg-red-500/20"
        >
          <LogOut className="h-5 w-5" />
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
      <span className="font-medium text-app">{value}</span>
    </div>
  );
}

/**
 * Блок «Привязать Telegram»: показывает bindToken и инструкцию
 * для отправки `/bind <код>` в gov-бот. Если аккаунт уже привязан —
 * отображает индикатор успеха.
 */
function TelegramBindSection() {
  const [info, setInfo] = useState<BindInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showInstr, setShowInstr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/bind-info")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d && typeof d === "object") setInfo(d as BindInfo);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function copy() {
    if (!info?.bindToken) return;
    try {
      await navigator.clipboard.writeText(info.bindToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard может быть недоступен — просто игнорируем */
    }
  }

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-xl border border-app bg-surface-2 p-4 text-sm text-muted-app">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка информации о привязке...
      </section>
    );
  }

  // Граждане не используют эту функцию — bindToken у них null.
  if (!info || !info.bindToken) return null;

  if (info.telegramBound) {
    return (
      <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-app">
              Telegram привязан ✅
            </div>
            <div className="text-sm text-muted-app">
              Вы получаете уведомления о назначенных делах через @{info.botUsername}.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-app bg-surface-2 p-4">
      <div className="flex items-start gap-3">
        <Send className="mt-0.5 h-6 w-6 flex-shrink-0 accent-app" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-app">
            Привязать Telegram
          </div>
          <div className="text-sm text-muted-app">
            Чтобы получать уведомления о назначенных делах.
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-app">
          Ваш код
        </div>
        <button
          type="button"
          onClick={copy}
          title="Нажмите, чтобы скопировать"
          className="inline-flex w-full items-center justify-between gap-3 rounded-lg border border-app bg-surface px-4 py-3 font-mono text-xl font-bold tracking-[0.3em] text-app transition hover:bg-surface-2"
        >
          <span>{info.bindToken}</span>
          {copied ? (
            <Check className="h-5 w-5 text-emerald-500" />
          ) : (
            <Copy className="h-5 w-5 text-muted-app" />
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowInstr((v) => !v)}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent-app px-4 py-3 text-base font-semibold text-white transition hover:opacity-90"
      >
        <Send className="h-5 w-5" />
        {showInstr ? "Скрыть инструкцию" : "Привязать Telegram"}
      </button>

      {showInstr && (
        <ol className="list-decimal space-y-1.5 rounded-lg border border-app bg-surface px-5 py-3 text-sm text-app">
          <li>
            Откройте бота{" "}
            <a
              href={`https://t.me/${info.botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold accent-app underline decoration-dotted underline-offset-2"
            >
              @{info.botUsername}
            </a>
            .
          </li>
          <li>
            Отправьте команду:{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">
              /bind {info.bindToken}
            </code>
          </li>
          <li>Бот подтвердит привязку и вы начнёте получать уведомления.</li>
        </ol>
      )}
    </section>
  );
}
