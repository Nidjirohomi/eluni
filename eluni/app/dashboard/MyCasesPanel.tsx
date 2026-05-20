"use client";

import { Clock, MapPin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ComplaintRow } from "./types";

interface Props {
  items: ComplaintRow[];
  onPick: (c: ComplaintRow) => void;
}

export function MyCasesPanel({ items, onPick }: Props) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-app bg-surface-2 p-6 text-center text-base text-muted-app">
        {t("myCases.empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onPick(c)}
            className="w-full rounded-xl border border-app bg-surface-2 p-4 text-left transition hover:bg-surface"
          >
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                {c.category}
              </span>
              <PriorityChip priority={c.priority} />
              <span className="ml-auto text-sm text-muted-app">
                <Clock className="mr-1.5 inline h-4 w-4" />
                {new Date(c.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
            <div className="line-clamp-2 text-base leading-snug text-app">{c.officialText}</div>
            {c.address && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-app">
                <MapPin className="h-4 w-4" />
                {c.address}
              </div>
            )}
          </button>
        </li>
      ))}
    </ul>
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
