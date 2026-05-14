"use client";

import {
  Briefcase,
  ListTodo,
  BarChart3,
  Settings,
  Flame,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
}

export function Toolbar({
  activePanel,
  onSelect,
  onToggleHeatmap,
  heatmapOn,
}: Props) {
  const { t } = useI18n();

  const toggle = (p: Exclude<ToolbarPanel, null>) =>
    onSelect(activePanel === p ? null : p);

  return (
    <aside className="flex h-full w-20 flex-shrink-0 flex-col items-stretch justify-between border-r border-app bg-surface py-3">
      <div className="flex flex-col items-stretch gap-1 px-1.5">
        <div
          className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-app text-white"
          title="ElUni"
        >
          <ShieldCheck className="h-5 w-5" />
        </div>

        <ToolbarItem
          active={activePanel === "my"}
          onClick={() => toggle("my")}
          label={t("toolbar.myCasesShort")}
          title={t("toolbar.myCases")}
          Icon={Briefcase}
        />
        <ToolbarItem
          active={activePanel === "list"}
          onClick={() => toggle("list")}
          label={t("toolbar.complaintsShort")}
          title={t("toolbar.complaints")}
          Icon={ListTodo}
        />
        <ToolbarItem
          active={activePanel === "analytics"}
          onClick={() => toggle("analytics")}
          label={t("toolbar.analyticsShort")}
          title={t("toolbar.analytics")}
          Icon={BarChart3}
        />
        <ToolbarItem
          active={heatmapOn}
          onClick={onToggleHeatmap}
          label={t("toolbar.heatmapShort")}
          title={t("toolbar.toggleHeatmap")}
          Icon={Flame}
        />
      </div>

      <div className="flex flex-col items-stretch gap-1 px-1.5">
        <ToolbarItem
          active={activePanel === "profile"}
          onClick={() => toggle("profile")}
          label={t("toolbar.profileShort")}
          title={t("toolbar.profile")}
          Icon={User}
        />
        <ToolbarItem
          active={activePanel === "settings"}
          onClick={() => toggle("settings")}
          label={t("toolbar.settingsShort")}
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
  label,
  title,
  Icon,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title: string;
  Icon: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 transition disabled:opacity-50 ${
        active
          ? "bg-accent-app text-white"
          : "text-app hover:bg-surface-2"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] leading-tight">{label}</span>
    </button>
  );
}
