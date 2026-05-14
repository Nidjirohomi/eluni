"use client";

import Link from "next/link";
import { ShieldCheck, Send, Search, Sun, Moon, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();

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
            <Link
              href="/track"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-app transition hover:bg-surface-2"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t("public.track")}</span>
            </Link>

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
