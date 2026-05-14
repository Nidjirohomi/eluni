"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/I18nProvider";
import { useTheme, type Theme } from "@/lib/theme/ThemeProvider";

export function SettingsPanel() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-5">
      {/* Тема */}
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-app">
          {t("settings.theme")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <ThemeButton
            current={theme}
            value="light"
            label={t("settings.themeLight")}
            Icon={Sun}
            onClick={() => setTheme("light")}
          />
          <ThemeButton
            current={theme}
            value="dark"
            label={t("settings.themeDark")}
            Icon={Moon}
            onClick={() => setTheme("dark")}
          />
        </div>
      </section>

      {/* Язык */}
      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-app">
          {t("settings.language")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <LocaleButton
            current={locale}
            value="ru"
            label="Русский"
            onClick={() => setLocale("ru")}
          />
          <LocaleButton
            current={locale}
            value="kg"
            label="Кыргызча"
            onClick={() => setLocale("kg")}
          />
        </div>
      </section>
    </div>
  );
}

function ThemeButton({
  current,
  value,
  label,
  Icon,
  onClick,
}: {
  current: Theme;
  value: Theme;
  label: string;
  Icon: typeof Sun;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? "border-transparent bg-accent-app text-white"
          : "border-app bg-surface-2 text-app hover:bg-surface"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function LocaleButton({
  current,
  value,
  label,
  onClick,
}: {
  current: Locale;
  value: Locale;
  label: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm transition ${
        active
          ? "border-transparent bg-accent-app text-white"
          : "border-app bg-surface-2 text-app hover:bg-surface"
      }`}
    >
      {label}
    </button>
  );
}
