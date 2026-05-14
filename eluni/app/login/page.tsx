"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Loader2,
  AlertCircle,
  LogIn,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/dashboard";

  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.push(from.startsWith("/dashboard") ? from : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.unknown")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      {/* Тулбар: тема / язык */}
      <div className="absolute right-6 top-6 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setLocale(locale === "ru" ? "kg" : "ru")}
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-app transition hover:bg-surface-2"
          title="Сменить язык / Тилди алмаштыруу"
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{locale}</span>
        </button>
        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-app transition hover:bg-surface-2"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="mb-8 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 accent-app" />
        <h1 className="text-2xl font-semibold tracking-tight text-app">
          {t("login.title")}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-app bg-surface p-6"
      >
        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-app"
          >
            {t("login.username")}
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="mvd"
            className="w-full rounded-xl border border-app bg-surface-2 px-4 py-3 text-sm text-app placeholder:text-muted-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-app"
          >
            {t("login.password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••"
            className="w-full rounded-xl border border-app bg-surface-2 px-4 py-3 text-sm text-app placeholder:text-muted-app focus:border-accent-app focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-app px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {t("login.submit")}
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-app bg-surface p-4 text-xs text-muted-app">
        <div className="mb-3 font-medium text-app">
          {t("login.testAccounts")} ({t("login.passwordHint")}{" "}
          <code className="accent-app">123123</code>)
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 pb-1 text-[10px] uppercase tracking-wide text-muted-app">
            <span>Сотрудник</span>
            <span>Начальник</span>
            <span className="whitespace-nowrap">Орган</span>
          </div>
          <div className="space-y-1.5 font-mono">
            <AccountRow employee="mvd" admin="admin_mvd" org="МВД" />
            <AccountRow employee="gai" admin="admin_gai" org="ГАИ" />
            <AccountRow employee="tazalyk" admin="admin_tazalyk" org="Тазалык" />
            <AccountRow
              employee="vodokanal"
              admin="admin_vodokanal"
              org="Бишкекводоканал"
            />
            <AccountRow
              employee="teploset"
              admin="admin_teploset"
              org="Бишкектеплосеть"
            />
            <AccountRow employee="meria" admin="admin_meria" org="Мэрия" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountRow({
  employee,
  admin,
  org,
}: {
  employee: string;
  admin: string;
  org: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
      <span className="truncate">{employee}</span>
      <span className="truncate">{admin}</span>
      <span className="whitespace-nowrap text-muted-app">{org}</span>
    </div>
  );
}
