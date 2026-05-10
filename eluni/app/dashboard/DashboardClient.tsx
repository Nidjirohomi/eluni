"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Loader2,
  CheckCircle2,
  Wrench,
  Clock,
  UserPlus,
  MapPin,
  Flame,
} from "lucide-react";

export interface ComplaintRow {
  id: string;
  originalText: string;
  officialText: string;
  category: string;
  priority: string;
  assignedTo: string;
  assignedUser: string | null;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const ComplaintsMap = dynamic(() => import("./ComplaintsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] text-sm text-zinc-500">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Загрузка карты...
    </div>
  ),
});

const STATUS_LABELS: Record<
  string,
  { label: string; className: string; Icon: typeof Clock }
> = {
  pending: {
    label: "В ожидании",
    className: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
    Icon: Clock,
  },
  in_progress: {
    label: "В работе",
    className: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30",
    Icon: Wrench,
  },
  resolved: {
    label: "Решено",
    className: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    Icon: CheckCircle2,
  },
};

const PRIORITY_STYLES: Record<string, string> = {
  Высокий: "bg-red-500/15 text-red-400 ring-1 ring-red-500/30",
  Средний: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
  Низкий: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
};

interface Props {
  org: string;
  role: string;
  username: string;
  initialComplaints: ComplaintRow[];
}

export function DashboardClient({
  org,
  role,
  username,
  initialComplaints,
}: Props) {
  const [complaints, setComplaints] =
    useState<ComplaintRow[]>(initialComplaints);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);
  const [assignName, setAssignName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of complaints) set.add(c.category);
    return Array.from(set).sort();
  }, [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (categoryFilter !== "all" && c.category !== categoryFilter)
        return false;
      if (priorityFilter !== "all" && c.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [complaints, statusFilter, categoryFilter, priorityFilter]);

  const onMap = useMemo(
    () => filtered.filter((c) => c.lat !== null && c.lng !== null),
    [filtered]
  );

  async function patchComplaint(
    id: string,
    body: { status: string; assignedUser?: string | null }
  ) {
    setPendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      startTransition(() => {
        setComplaints((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: data.status,
                  assignedUser: data.assignedUser ?? null,
                  updatedAt: data.updatedAt,
                }
              : c
          )
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось обновить.");
    } finally {
      setPendingId(null);
    }
  }

  function takeInWork(id: string) {
    void patchComplaint(id, { status: "in_progress", assignedUser: username });
  }

  function close(id: string) {
    void patchComplaint(id, { status: "resolved" });
  }

  function startAssign(id: string) {
    setAssignTarget(id);
    setAssignName("");
  }

  async function confirmAssign() {
    if (!assignTarget || !assignName.trim()) return;
    await patchComplaint(assignTarget, {
      status: "in_progress",
      assignedUser: assignName.trim(),
    });
    setAssignTarget(null);
    setAssignName("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <Filter
          label="Статус"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "Все" },
            { value: "pending", label: "В ожидании" },
            { value: "in_progress", label: "В работе" },
            { value: "resolved", label: "Решено" },
          ]}
        />
        <Filter
          label="Категория"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={[
            { value: "all", label: "Все" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
        />
        <Filter
          label="Приоритет"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: "all", label: "Все" },
            { value: "Высокий", label: "Высокий" },
            { value: "Средний", label: "Средний" },
            { value: "Низкий", label: "Низкий" },
          ]}
        />
        <div className="ml-auto text-sm text-zinc-500">
          Показано: <span className="text-zinc-200">{filtered.length}</span> из{" "}
          {complaints.length}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <h2 className="text-lg font-semibold">Актуальные проблемы</h2>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-zinc-500">
              По текущим фильтрам жалоб нет.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => {
                const status = STATUS_LABELS[c.status] ?? STATUS_LABELS.pending;
                const StatusIcon = status.Icon;
                const isPending = pendingId === c.id;
                return (
                  <article
                    key={c.id}
                    className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium ring-1 ${status.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-medium ${
                          PRIORITY_STYLES[c.priority] ??
                          "bg-zinc-500/15 text-zinc-300"
                        }`}
                      >
                        {c.priority}
                      </span>
                      <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-300">
                        {c.category}
                      </span>
                      <span className="ml-auto text-zinc-500">
                        {new Date(c.createdAt).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-zinc-200">
                      {c.officialText}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      {c.address && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {c.address}
                        </span>
                      )}
                      {c.assignedUser && (
                        <span className="inline-flex items-center gap-1 text-zinc-300">
                          Исполнитель:{" "}
                          <span className="font-medium">{c.assignedUser}</span>
                        </span>
                      )}
                      <span className="font-mono text-zinc-600">{c.id.slice(0, 8)}…</span>
                    </div>

                    {assignTarget === c.id ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
                        <input
                          autoFocus
                          value={assignName}
                          onChange={(e) => setAssignName(e.target.value)}
                          placeholder="Имя сотрудника / бригады"
                          className="flex-1 rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={confirmAssign}
                          disabled={!assignName.trim() || isPending}
                          className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
                        >
                          Назначить
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssignTarget(null)}
                          className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {c.status === "pending" && (
                          <ActionButton
                            onClick={() => takeInWork(c.id)}
                            disabled={isPending}
                            tone="indigo"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Взять в работу
                          </ActionButton>
                        )}
                        {c.status !== "resolved" && (
                          <ActionButton
                            onClick={() => startAssign(c.id)}
                            disabled={isPending}
                            tone="muted"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            Назначить
                          </ActionButton>
                        )}
                        {c.status === "in_progress" && (
                          <ActionButton
                            onClick={() => close(c.id)}
                            disabled={isPending}
                            tone="emerald"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Закрыть
                          </ActionButton>
                        )}
                        {isPending && (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Карта обращений</h2>
            <button
              type="button"
              onClick={() => setShowHeatmap((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                showHeatmap
                  ? "bg-orange-500/20 text-orange-300 hover:bg-orange-500/30"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              {showHeatmap ? "Тепловая карта вкл." : "Тепловая карта"}
            </button>
          </div>

          <ComplaintsMap
            complaints={onMap}
            showHeatmap={showHeatmap}
            org={org}
          />

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-zinc-500">
            <div className="mb-2 font-medium text-zinc-300">Цвет маркера = давность:</div>
            <div className="grid grid-cols-2 gap-y-1">
              <Legend color="#10b981" label="< 1 часа" />
              <Legend color="#f59e0b" label="1–6 часов" />
              <Legend color="#fb923c" label="6–24 часа" />
              <Legend color="#ef4444" label="> 24 часов" />
            </div>
          </div>
        </div>
      </div>
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
    <label className="flex items-center gap-2 text-sm text-zinc-400">
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-[#0d0d0d] px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
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

function ActionButton({
  onClick,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone: "indigo" | "emerald" | "muted";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25",
    emerald: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
    muted: "bg-white/5 text-zinc-300 hover:bg-white/10",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
