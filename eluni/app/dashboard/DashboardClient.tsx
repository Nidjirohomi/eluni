"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isManager, isSuperadmin, canActOnComplaints, type Role } from "@/lib/roles";
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

const ComplaintsMap = dynamic(() => import("./ComplaintsMap2GIS"), {
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

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDeepLinkId = searchParams?.get("complaintId") ?? null;

  const [complaints, setComplaints] =
    useState<ComplaintRow[]>(initialComplaints);
  const [activePanel, setActivePanel] = useState<ToolbarPanel>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selected, setSelected] = useState<ComplaintRow | null>(null);
  const [popupFor, setPopupFor] = useState<ComplaintRow | null>(null);
  const [duty, setDuty] = useState<"on_duty" | "off_duty">(initialDuty);
  const [dutyPending, setDutyPending] = useState(false);
  const [myCases, setMyCases] = useState<ComplaintRow[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Deep-link: ?complaintId=... — открыть карточку нужной жалобы.
  // Если она не в начальном наборе — догружаем по API.
  useEffect(() => {
    if (!initialDeepLinkId) return;
    const local = initialComplaints.find((c) => c.id === initialDeepLinkId);
    if (local) {
      setSelected(local);
      return;
    }
    let cancelled = false;
    fetch(`/api/complaints/${encodeURIComponent(initialDeepLinkId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.id) return;
        setSelected(data as ComplaintRow);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeepLinkId]);

  // При открытии «Мои дела» — догружаем актуальный список (не для супер-админа).
  useEffect(() => {
    if (activePanel !== "my") return;
    if (isSuperadmin(role)) return;
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
  }, [activePanel, complaints, role]);

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
  const canAct = canActOnComplaints(role);
  const superadmin = isSuperadmin(role);

  return (
    <div className="flex h-full w-full">
      {/* Левая иконочная панель */}
      <Toolbar
        activePanel={activePanel}
        onSelect={setActivePanel}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        heatmapOn={showHeatmap}
        hideMyCases={superadmin}
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
          width="700px"
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
            hideDuty={superadmin}
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
          onMarkerClick={(c) => {
            setPopupFor(c);
            setSelected(null); // карточка не открывается, пока пользователь не нажмёт «Подробнее»
          }}
          popupFor={popupFor}
          popupDetailsLabel={t("complaint.details")}
          onPopupClose={() => setPopupFor(null)}
          onPopupDetails={(c) => {
            setPopupFor(null);
            setSelected(c);
            // обновляем URL для «глубокой» ссылки
            const url = new URL(window.location.href);
            url.searchParams.set("complaintId", c.id);
            router.replace(url.pathname + "?" + url.searchParams.toString(), {
              scroll: false,
            });
          }}
          height="100%"
        />

        {/* Статус-индикатор в правом верхнем углу */}
        <div
          className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2"
          style={{ zIndex: 1000 }}
        >
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-app bg-surface/95 px-4 py-2 text-sm font-medium shadow-md backdrop-blur">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                superadmin
                  ? "bg-violet-500"
                  : duty === "on_duty"
                  ? "bg-emerald-500"
                  : "bg-zinc-400"
              }`}
            />
            <span className="text-app">{displayName}</span>
            <span className="text-muted-app">·</span>
            <span className="text-muted-app">
              {superadmin
                ? t("role.superadmin")
                : duty === "on_duty"
                ? t("duty.on")
                : t("duty.off")}
            </span>
          </div>
          {globalError && (
            <div className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
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
              canAct={canAct}
              onClose={() => {
                setSelected(null);
                // снимаем complaintId из URL
                const url = new URL(window.location.href);
                if (url.searchParams.has("complaintId")) {
                  url.searchParams.delete("complaintId");
                  const qs = url.searchParams.toString();
                  router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, {
                    scroll: false,
                  });
                }
              }}
              onUpdate={onUpdateComplaint}
            />
          </div>
        )}
      </main>
    </div>
  );
}
