"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ComplaintRow } from "./types";

interface Props {
  items: ComplaintRow[];
  onPick: (c: ComplaintRow) => void;
}

export function ComplaintListPanel({ items, onPick }: Props) {
  const { t } = useI18n();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter)
        return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [items, statusFilter, categoryFilter, priorityFilter]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Filter
          label={t("filters.status")}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "pending", label: t("status.pending") },
            { value: "in_progress", label: t("status.in_progress") },
            { value: "resolved", label: t("status.resolved") },
          ]}
        />
        <Filter
          label={t("filters.category")}
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: "all", label: t("common.all") },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Filter
          label={t("filters.priority")}
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: "all", label: t("common.all") },
            { value: "Высокий", label: t("priority.high") },
            { value: "Средний", label: t("priority.medium") },
            { value: "Низкий", label: t("priority.low") },
          ]}
        />
      </div>

      <div className="text-sm text-muted-app">
        {t("common.showing")}:{" "}
        <span className="font-semibold text-app">{filtered.length}</span>{" "}
        {t("common.of")} {items.length}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-app bg-surface-2 p-6 text-center text-base text-muted-app">
          {t("common.noData")}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="w-full rounded-xl border border-app bg-surface-2 p-4 text-left transition hover:bg-surface"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <StatusChip status={c.status} />
                  <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                    {c.category}
                  </span>
                  <PriorityChip priority={c.priority} />
                  <span className="ml-auto text-sm text-muted-app">
                    {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <div className="line-clamp-2 text-base leading-snug text-app">
                  {c.officialText}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-app">
                  <span className="truncate">{c.address ?? "—"}</span>
                  <span className="flex-shrink-0">{c.assignedUser ?? t("complaint.noAssignee")}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-app">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusChip({ status }: { status: string }) {
  const { t } = useI18n();
  const styles: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    in_progress: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        styles[status] ?? "bg-zinc-500/15"
      }`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

function PriorityChip({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    Высокий: "bg-red-500/15 text-red-600 dark:text-red-300",
    Средний: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    Низкий: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
        styles[priority] ?? "bg-zinc-500/15"
      }`}
    >
      {priority}
    </span>
  );
}
