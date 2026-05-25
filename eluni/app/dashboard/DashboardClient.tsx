"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isManager, isSuperadmin, canActOnComplaints, type Role } from "@/lib/roles";
import type { ComplaintRow } from "./types";
import { TopBar } from "./TopBar";
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
    <div className="flex h-full w-full items-center justify-center bg-app text-sm text-muted-app">
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
  const [searchQuery, setSearchQuery] = useState("");

  // Глобальный поиск из TopBar — фильтр по тексту, ID, адресу, категории.
  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return complaints;
    return complaints.filter((c) => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.officialText.toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.assignedUser ?? "").toLowerCase().includes(q)
      );
    });
  }, [complaints, searchQuery]);

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

  // Закрытие правой панели «Инцидент» (и снятие complaintId из URL).
  function closeSelected() {
    setSelected(null);
    const url = new URL(window.location.href);
    if (url.searchParams.has("complaintId")) {
      url.searchParams.delete("complaintId");
      const qs = url.searchParams.toString();
      router.replace(qs ? `${url.pathname}?${qs}` : url.pathname, {
        scroll: false,
      });
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Верхняя горизонтальная панель — лого, поиск, иконки, аватар */}
      <TopBar
        displayName={displayName}
        role={role}
        org={org}
        duty={duty}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAnalytics={() =>
          setActivePanel(activePanel === "analytics" ? null : "analytics")
        }
        onOpenProfile={() =>
          setActivePanel(activePanel === "profile" ? null : "profile")
        }
      />

      {/* Основной ряд: sidebar + карта + (правая панель / drawer / карточка инцидента) */}
      <div className="flex min-h-0 flex-1">
        {/* Левый узкий sidebar */}
        <Toolbar
          activePanel={activePanel}
          onSelect={setActivePanel}
          onToggleHeatmap={() => setShowHeatmap((v) => !v)}
          heatmapOn={showHeatmap}
          hideMyCases={superadmin}
        />

        {/* Карта — занимает всё пространство между sidebar и правой панелью */}
        <main className="relative min-w-0 flex-1">
          <ComplaintsMap
            complaints={filteredComplaints}
            showHeatmap={showHeatmap}
            org={org}
            onMarkerClick={(c) => {
              setPopupFor(c);
              setSelected(null);
            }}
            popupFor={popupFor}
            popupDetailsLabel={t("complaint.details")}
            onPopupClose={() => setPopupFor(null)}
            onPopupDetails={(c) => {
              setPopupFor(null);
              setSelected(c);
              const url = new URL(window.location.href);
              url.searchParams.set("complaintId", c.id);
              router.replace(
                url.pathname + "?" + url.searchParams.toString(),
                { scroll: false }
              );
            }}
            height="100%"
          />

          {/* Глобальная ошибка — поверх карты */}
          {globalError && (
            <div
              className="pointer-events-auto absolute right-4 top-4 flex max-w-sm items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 shadow-card"
              style={{ zIndex: 1000 }}
            >
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>{globalError}</div>
            </div>
          )}
        </main>

        {/* Правая панель — единственный слот: или жалоба, или drawer выбранного раздела.
            Если выбрана жалоба — она имеет приоритет над drawer-ами. */}
        {selected ? (
          <Drawer
            title={t("topbar.section")}
            onClose={closeSelected}
            width="380px"
          >
            <ComplaintCard
              complaint={selected}
              myDisplayName={displayName}
              canManage={canManage}
              canAct={canAct}
              onClose={closeSelected}
              onUpdate={onUpdateComplaint}
              embedded
            />
          </Drawer>
        ) : (
          <>
            {activePanel === "my" && (
              <Drawer
                title={t("myCases.title")}
                subtitle={t("myCases.subtitle")}
                onClose={() => setActivePanel(null)}
                width="400px"
              >
                <MyCasesPanel items={myCases} onPick={setSelected} />
              </Drawer>
            )}
            {activePanel === "list" && (
              <Drawer
                title={t("complaintList.title")}
                subtitle={t("complaintList.subtitle")}
                onClose={() => setActivePanel(null)}
                width="440px"
              >
                <ComplaintListPanel
                  items={filteredComplaints}
                  onPick={setSelected}
                />
              </Drawer>
            )}
            {activePanel === "analytics" && (
              <Drawer
                title={t("toolbar.analytics")}
                onClose={() => setActivePanel(null)}
                width="640px"
              >
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
                width="380px"
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
                width="360px"
              >
                <SettingsPanel />
              </Drawer>
            )}
          </>
        )}
      </div>
    </div>
  );
}
