"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Send,
  Sun,
  Moon,
  Languages,
  Inbox,
  LogIn,
  LogOut,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

interface MeData {
  userId: string;
  role: string;
  username: string;
  displayName: string;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();
  const [me, setMe] = useState<MeData | null>(null);

  // Сессия для шапки — определяем, гражданин ли пользователь, чтобы показать
  // ссылку «Мои жалобы» / «Войти» / «Выйти».
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d ?? null))
      .catch(() => setMe(null));
  }, []);

  const isCitizen = me?.role === "citizen";

  return (
    <div className="min-h-screen bg-app text-app">
      <header className="sticky top-0 z-30 border-b border-app bg-surface/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <ShieldCheck className="h-5 w-5 accent-app" />
            <span>{t("common.appName")}</span>
          </Link>

          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-app transition hover:bg-surface-2"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("public.submitComplaint")}</span>
            </Link>
            {/* Публичной страницы /track больше нет в шапке — отслеживание
                жалоб доступно гражданам в /my/complaints после входа. */}
            {isCitizen && (
              <Link
                href="/my/complaints"
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-app transition hover:bg-surface-2"
              >
                <Inbox className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {t("public.myComplaints")}
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setLocale(locale === "ru" ? "kg" : "ru")}
              title="Сменить язык / Тилди алмаштыруу"
              className="ml-1 flex items-center gap-1 rounded-lg px-2.5 py-2 text-app transition hover:bg-surface-2"
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{locale}</span>
            </button>

            <button
              type="button"
              onClick={toggle}
              title="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-app transition hover:bg-surface-2"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Вход / выход — справа от темы. */}
            {me ? (
              <a
                href="/api/auth/logout"
                title={t("toolbar.logout")}
                className="ml-1 flex items-center gap-1.5 rounded-lg border border-app bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-app transition hover:bg-surface"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{me.displayName}</span>
              </a>
            ) : (
              <Link
                href="/login?from=/"
                className="ml-1 flex items-center gap-1.5 rounded-lg bg-accent-app px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t("login.tundukButton")}
                </span>
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-muted-app">
        {t("common.appName")} · MVP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
