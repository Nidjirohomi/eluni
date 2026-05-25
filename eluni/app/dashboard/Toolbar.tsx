"use client";

import {
  ListTodo,
  BarChart3,
  Settings,
  Flame,
  Home,
  User,
  Globe,
  type LucideIcon,
} from "lucide-react";
import { useI18n, type Locale } from "@/lib/i18n/I18nProvider";

export type ToolbarPanel =
  | "my"
  | "list"
  | "analytics"
  | "profile"
  | "settings"
  | null;

interface Props {
  activePanel: ToolbarPanel;
  onSelect: (p: ToolbarPanel) => void;
  onToggleHeatmap: () => void;
  heatmapOn: boolean;
  /** Скрыть вкладку «Мои дела» (например, для супер-админа). */
  hideMyCases?: boolean;
}

/**
 * Левый узкий sidebar (~64px) — тёмный в обеих темах, как на макете.
 * Сверху: основные разделы. Внизу: язык, профиль, настройки.
 */
export function Toolbar({
  activePanel,
  onSelect,
  onToggleHeatmap,
  heatmapOn,
  hideMyCases,
}: Props) {
  const { t, locale, setLocale } = useI18n();

  const toggle = (p: Exclude<ToolbarPanel, null>) =>
    onSelect(activePanel === p ? null : p);

  const cycleLocale = () => {
    const next: Locale = locale === "ru" ? "kg" : "ru";
    setLocale(next);
  };

  return (
    <aside className="bg-sidebar border-sidebar relative z-20 flex h-full w-16 flex-shrink-0 flex-col items-center justify-between border-r py-3">
      {/* Верхняя группа */}
      <div className="flex w-full flex-col items-center gap-1 px-2">
        {!hideMyCases ? (
          <ToolbarItem
            active={activePanel === "my"}
            onClick={() => toggle("my")}
            title={t("toolbar.myCases")}
            Icon={Home}
          />
        ) : (
          <ToolbarItem
            active={activePanel === "list"}
            onClick={() => toggle("list")}
            title={t("toolbar.complaints")}
            Icon={Home}
          />
        )}
        <ToolbarItem
          active={activePanel === "list"}
          onClick={() => toggle("list")}
          title={t("toolbar.complaints")}
          Icon={ListTodo}
        />
        <ToolbarItem
          active={activePanel === "analytics"}
          onClick={() => toggle("analytics")}
          title={t("toolbar.analytics")}
          Icon={BarChart3}
        />
        <ToolbarItem
          active={heatmapOn}
          onClick={onToggleHeatmap}
          title={t("toolbar.toggleHeatmap")}
          Icon={Flame}
        />
        <ToolbarItem
          active={false}
          onClick={cycleLocale}
          title={`${t("settings.language")}: ${locale.toUpperCase()}`}
          Icon={Globe}
          rightLabel={locale.toUpperCase()}
        />
      </div>

      {/* Нижняя группа */}
      <div className="flex w-full flex-col items-center gap-1 px-2">
        <ToolbarItem
          active={activePanel === "profile"}
          onClick={() => toggle("profile")}
          title={t("toolbar.profile")}
          Icon={User}
        />
        <ToolbarItem
          active={activePanel === "settings"}
          onClick={() => toggle("settings")}
          title={t("toolbar.settings")}
          Icon={Settings}
        />
      </div>
    </aside>
  );
}

function ToolbarItem({
  active,
  onClick,
  title,
  Icon,
  disabled,
  rightLabel,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  Icon: LucideIcon;
  disabled?: boolean;
  rightLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      aria-label={title}
      className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition disabled:opacity-40 ${
        active
          ? "bg-sidebar-active text-sidebar-active"
          : "text-sidebar hover:bg-sidebar-hover hover:text-sidebar-active"
      }`}
    >
      {/* Активный левый «акцент» как в макете */}
      {active && (
        <span className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-app" />
      )}
      <Icon className="h-5 w-5" />
      {rightLabel && (
        <span className="absolute -bottom-0.5 right-0 rounded-sm bg-sidebar-active/30 px-1 text-[9px] font-bold leading-none text-sidebar-active">
          {rightLabel}
        </span>
      )}
    </button>
  );
}
