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
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
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

      <div className="text-xs text-muted-app">
        {t("common.showing")}:{" "}
        <span className="text-app">{filtered.length}</span> {t("common.of")}{" "}
        {items.length}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-app bg-surface-2 p-6 text-center text-sm text-muted-app">
          {t("common.noData")}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="w-full rounded-xl border border-app bg-surface-2 p-3 text-left transition hover:bg-surface"
              >
                <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <StatusChip status={c.status} />
                  <span className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 font-medium text-indigo-600 dark:text-indigo-300">
                    {c.category}
                  </span>
                  <PriorityChip priority={c.priority} />
                  <span className="ml-auto text-muted-app">
                    {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <div className="line-clamp-2 text-xs text-app">
                  {c.officialText}
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-app">
                  <span>{c.address ?? "—"}</span>
                  <span>{c.assignedUser ?? t("complaint.noAssignee")}</span>
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
    <label className="flex flex-col gap-1 text-[10px] text-muted-app">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-app bg-surface px-2 py-1 text-xs text-app"
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
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
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
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
        styles[priority] ?? "bg-zinc-500/15"
      }`}
    >
      {priority}
    </span>
  );
}
