"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Fingerprint,
  MessageCircle,
  LogIn,
  ShieldAlert,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Props {
  /**
   * - "anonymous" — пользователь вообще не залогинен.
   * - "staff"     — залогинен, но это госслужащий, а не гражданин.
   */
  variant: "anonymous" | "staff";
}

const TELEGRAM_USERNAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "eluni_bot";
const TELEGRAM_URL = `https://t.me/${TELEGRAM_USERNAME}`;

/**
 * Заглушка публичной формы для неподходящих пользователей.
 * Анонимные жалобы доступны ТОЛЬКО через Telegram-бота — это сообщение
 * также обозначает данный поток.
 */
export function CitizenLoginGate({ variant }: Props) {
  const router = useRouter();
  const [tundukLoading, setTundukLoading] = useState(false);
  const [tundukError, setTundukError] = useState<string | null>(null);

  // Заглушка верификации через Түндүк: входим под тестовым citizen-аккаунтом.
  // В продакшене здесь будет редирект на провайдер Түндүк.
  async function handleTundukLogin() {
    if (tundukLoading) return;
    setTundukLoading(true);
    setTundukError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "citizen", password: "123123" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string })?.error ?? `HTTP ${res.status}`
        );
      }
      // После входа возвращаемся на главную (форма подачи) — теперь уже от лица гражданина.
      router.push("/");
      router.refresh();
    } catch (err) {
      setTundukError(err instanceof Error ? err.message : "Не удалось войти");
      setTundukLoading(false);
    }
  }

  if (variant === "staff") {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Подать обращение
          </h1>
          <p className="mt-3 max-w-2xl text-muted-app">
            Этот аккаунт зарегистрирован как госслужащий. Подача жалоб с
            личного кабинета госслужащего недоступна.
          </p>
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="space-y-2">
            <p className="font-medium">Доступ ограничен по роли.</p>
            <p>
              Чтобы подать обращение от своего имени, войдите через Түндүк как
              гражданин или воспользуйтесь Telegram-ботом.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-app bg-surface px-3 py-1.5 text-xs font-medium text-app hover:bg-surface-2"
              >
                <LogIn className="h-3.5 w-3.5" /> Перейти в рабочий кабинет
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // variant === "anonymous"
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Подать обращение
        </h1>
        <p className="mt-3 max-w-2xl text-muted-app">
          ElUni — единая платформа для обращений граждан. AI-классификатор сам
          определит категорию, приоритет и нужный госорган.
        </p>
      </section>

      <section className="space-y-4 rounded-2xl border border-app bg-surface p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 accent-app" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-app">
              Требуется верификация
            </h2>
            <p className="text-sm text-muted-app">
              Подача жалоб через сайт доступна только верифицированным
              пользователям. Войдите через Түндүк или воспользуйтесь нашим
              Telegram-ботом — там можно отправить обращение анонимно.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Түндүк — заглушка верификации: вход под тестовым гражданином.
              Будет заменено на реальный OAuth-поток Түндүк. */}
          <button
            type="button"
            onClick={handleTundukLogin}
            disabled={tundukLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent-app px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {tundukLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Fingerprint className="h-4 w-4" />
            )}
            Войти через Түндүк
          </button>

          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-app bg-surface-2 px-5 py-3 text-sm font-medium text-app transition hover:bg-surface"
          >
            <MessageCircle className="h-4 w-4" />
            Открыть Telegram-бота
          </a>
        </div>

        {tundukError && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{tundukError}</span>
          </div>
        )}

        <p className="text-xs text-muted-app">
          Анонимные обращения принимаются только через Telegram-бота.
          Верификация через Түндүк позволит редактировать и отзывать ваши
          жалобы.
        </p>
      </section>
    </div>
  );
}
