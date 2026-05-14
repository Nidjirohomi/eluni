"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isManager, type Role } from "@/lib/roles";
import type { ComplaintRow } from "./types";
import { Toolbar, type ToolbarPanel } from "./Toolbar";
import { Drawer } from "./Drawer";
import { ComplaintCard } from "./ComplaintCard";
import { MyCasesPanel } from "./MyCasesPanel";
import { ComplaintListPanel } from "./ComplaintListPanel";
import { SettingsPanel } from "./SettingsPanel";
import { ProfilePanel } from "./ProfilePanel";
import { ExportPanel } from "./ExportPanel";

// Re-export для существующих импортов (backward compatibility).
export type { ComplaintRow } from "./types";

const ComplaintsMap = dynamic(() => import("./ComplaintsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Загрузка карты...
    </div>
  ),
});

interface Props {
  org: string;
  role: Role;
  username: string;
  displayName: string;
  initialComplaints: ComplaintRow[];
  initialDuty: "on_duty" | "off_duty";
}

const AnalyticsClient = dynamic(
  () => import("./analytics/AnalyticsClient").then((m) => m.AnalyticsClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center text-muted-app">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      </div>
    ),
  }
);

export function DashboardClient({
  org,
  role,
  username,
  displayName,
  initialComplaints,
  initialDuty,
}: Props) {
  const { t } = useI18n();

  const [complaints, setComplaints] =
    useState<ComplaintRow[]>(initialComplaints);
  const [activePanel, setActivePanel] = useState<ToolbarPanel>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selected, setSelected] = useState<ComplaintRow | null>(null);
  const [duty, setDuty] = useState<"on_duty" | "off_duty">(initialDuty);
  const [dutyPending, setDutyPending] = useState(false);
  const [myCases, setMyCases] = useState<ComplaintRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // При открытии «Мои дела» — догружаем актуальный список
  useEffect(() => {
    if (activePanel !== "my") return;
    let cancel = false;
    fetch("/api/complaints/my")
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (Array.isArray(d)) setMyCases(d);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [activePanel, complaints]);

  // Периодический refresh полного списка (раз в 30 сек)
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/complaints");
        if (!res.ok) return;
        const data = (await res.json()) as ComplaintRow[];
        setComplaints(data);
      } catch {
        // молча игнорим
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  async function toggleDuty() {
    setDutyPending(true);
    setGlobalError(null);
    try {
      const action = duty === "on_duty" ? "end" : "start";
      const res = await fetch("/api/auth/duty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setDuty(action === "start" ? "on_duty" : "off_duty");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setDutyPending(false);
    }
  }

  function onUpdateComplaint(updated: ComplaintRow) {
    setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected(updated);
  }

  const canManage = isManager(role);

  return (
    <div className="flex h-full w-full">
      {/* Левая иконочная панель */}
      <Toolbar
        activePanel={activePanel}
        onSelect={setActivePanel}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        heatmapOn={showHeatmap}
      />

      {/* Drawer-панель (опциональная) */}
      {activePanel === "my" && (
        <Drawer
          title={t("myCases.title")}
          subtitle={t("myCases.subtitle")}
          onClose={() => setActivePanel(null)}
        >
          <MyCasesPanel items={myCases} onPick={setSelected} />
        </Drawer>
      )}
      {activePanel === "list" && (
        <Drawer
          title={t("complaintList.title")}
          subtitle={t("complaintList.subtitle")}
          onClose={() => setActivePanel(null)}
        >
          <ComplaintListPanel items={complaints} onPick={setSelected} />
        </Drawer>
      )}
      {activePanel === "analytics" && (
        <Drawer
          title={t("toolbar.analytics")}
          onClose={() => setActivePanel(null)}
          width="640px"
        >
          {/* Экспорт-отчёт переехал сюда из тулбара — ближе к аналитике. */}
          <div className="mb-5">
            <ExportPanel org={org} />
          </div>
          <AnalyticsClient />
        </Drawer>
      )}
      {activePanel === "profile" && (
        <Drawer
          title={t("profile.title")}
          subtitle={t("profile.subtitle")}
          onClose={() => setActivePanel(null)}
        >
          <ProfilePanel
            user={{ displayName, username, role, org }}
            duty={duty}
            dutyPending={dutyPending}
            onToggleDuty={toggleDuty}
          />
        </Drawer>
      )}
      {activePanel === "settings" && (
        <Drawer
          title={t("settings.title")}
          onClose={() => setActivePanel(null)}
        >
          <SettingsPanel />
        </Drawer>
      )}

      {/* Основная зона — карта + плавающая карточка */}
      <main className="relative flex-1">
        <ComplaintsMap
          complaints={complaints}
          showHeatmap={showHeatmap}
          org={org}
          onMarkerClick={(c) => setSelected(c)}
          height="100%"
        />

        {/* Статус-индикатор в правом верхнем углу */}
        <div
          className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2"
          style={{ zIndex: 1000 }}
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-app bg-surface/95 px-3 py-1.5 text-xs shadow-md backdrop-blur">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                duty === "on_duty" ? "bg-emerald-500" : "bg-zinc-400"
              }`}
            />
            <span className="text-app">{displayName}</span>
            <span className="text-muted-app">·</span>
            <span className="text-muted-app">
              {duty === "on_duty" ? t("duty.on") : t("duty.off")}
            </span>
          </div>
          {globalError && (
            <div className="pointer-events-auto flex max-w-xs items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <div>{globalError}</div>
            </div>
          )}
        </div>

        {/* Плавающая карточка жалобы по клику.
            z-[1000] — гарантированно поверх leaflet-pane (max ~700-800). */}
        {selected && (
          <div
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2"
            style={{ zIndex: 1000 }}
          >
            <ComplaintCard
              complaint={selected}
              myDisplayName={displayName}
              canManage={canManage}
              onClose={() => setSelected(null)}
              onUpdate={onUpdateComplaint}
            />
          </div>
        )}
      </main>
    </div>
  );
}
