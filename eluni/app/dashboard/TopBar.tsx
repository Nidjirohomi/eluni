"use client";

import { Search, BarChart3, Bell, ClipboardList } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isSuperadmin, isManager, type Role } from "@/lib/roles";

interface Props {
  displayName: string;
  role: Role;
  org: string;
  duty: "on_duty" | "off_duty";
  searchValue: string;
  onSearchChange: (v: string) => void;
  onOpenAnalytics: () => void;
  onOpenProfile: () => void;
}

/**
 * Верхняя горизонтальная панель: лого + название раздела слева,
 * глобальный поиск по жалобам по центру, иконки и аватар справа.
 *
 * Соответствует макету: высота 56px, белая (или тёмная) подложка,
 * нижняя граница border-topbar.
 */
export function TopBar({
  displayName,
  role,
  org,
  duty,
  searchValue,
  onSearchChange,
  onOpenAnalytics,
  onOpenProfile,
}: Props) {
  const { t } = useI18n();
  const superadmin = isSuperadmin(role);
  const manager = isManager(role);

  const roleLabel = superadmin
    ? t("role.superadmin")
    : manager
    ? `${org} · ${t("settings.role")}`
    : org;

  return (
    <header className="bg-topbar border-b border-topbar relative z-30 flex h-14 flex-shrink-0 items-center gap-3 px-4">
      {/* Лого + название раздела */}
      <div className="flex items-center gap-3 pr-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-app text-white shadow-sm">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="text-base font-semibold text-app">
          {t("topbar.section")}
        </div>
      </div>

      {/* Поиск — центрируется, ограничен по ширине */}
      <div className="mx-auto flex w-full max-w-xl items-center">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-app" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("topbar.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-app bg-surface pl-9 pr-3 text-sm text-app placeholder:text-muted-app focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
      </div>

      {/* Правая часть: иконки + пользователь */}
      <div className="flex items-center gap-1.5">
        <IconBtn title={t("toolbar.analytics")} onClick={onOpenAnalytics}>
          <BarChart3 className="h-5 w-5" />
        </IconBtn>
        <IconBtn title={t("topbar.notifications")} badge>
          <Bell className="h-5 w-5" />
        </IconBtn>

        <button
          type="button"
          onClick={onOpenProfile}
          className="ml-2 flex items-center gap-2.5 rounded-full px-1.5 py-1 transition hover:bg-surface-2"
        >
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs text-muted-app">{roleLabel}</div>
            <div className="max-w-[160px] truncate text-sm font-semibold text-app">
              {displayName}
            </div>
          </div>
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-app text-sm font-semibold text-white">
              {initials(displayName)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--topbar-bg)] ${
                superadmin
                  ? "bg-violet-500"
                  : duty === "on_duty"
                  ? "bg-emerald-500"
                  : "bg-zinc-400"
              }`}
            />
          </div>
        </button>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  badge,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-app transition hover:bg-surface-2 hover:text-app"
    >
      {children}
      {badge && (
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--topbar-bg)]" />
      )}
    </button>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
