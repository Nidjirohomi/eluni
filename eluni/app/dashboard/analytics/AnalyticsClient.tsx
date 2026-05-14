"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Sparkles,
  Clock,
} from "lucide-react";

interface AnalyticsData {
  org: string;
  months: number;
  total: number;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  monthly: { month: string; count: number }[];
  topDistricts: { district: string; count: number }[];
  avgResolutionHours: number | null;
}

interface PredictionData {
  org: string;
  basedOnDays: number;
  total7d: number;
  expectedTomorrow: number;
  trend: "rising" | "falling" | "stable";
  spikeCategory: string | null;
  reasoning: string;
  daily: { date: string; count: number }[];
}

const PIE_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#fb923c",
  "#a3a3a3",
];

export function AnalyticsClient() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [predLoading, setPredLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [aRes, pRes] = await Promise.all([
          fetch("/api/analytics?months=6"),
          fetch("/api/predictions"),
        ]);
        const a = await aRes.json();
        const p = await pRes.json();
        if (cancel) return;
        if (!aRes.ok) throw new Error(a?.error ?? "Ошибка загрузки аналитики");
        setAnalytics(a as AnalyticsData);
        setLoading(false);
        if (pRes.ok) setPrediction(p as PredictionData);
        setPredLoading(false);
      } catch (err) {
        if (cancel) return;
        setError(err instanceof Error ? err.message : "Ошибка");
        setLoading(false);
        setPredLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-app">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загрузка аналитики...
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">
        <AlertCircle className="mt-0.5 h-4 w-4" />
        <div>{error ?? "Не удалось загрузить аналитику."}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Всего за 6 мес." value={analytics.total} />
        <Stat
          label="В работе"
          value={analytics.byStatus.in_progress ?? 0}
          tone="indigo"
        />
        <Stat
          label="Решено"
          value={analytics.byStatus.resolved ?? 0}
          tone="emerald"
        />
        <Stat
          label="Среднее время решения"
          value={
            analytics.avgResolutionHours !== null
              ? `${analytics.avgResolutionHours} ч`
              : "—"
          }
          tone="muted"
        />
      </div>

      <PredictionCard prediction={prediction} loading={predLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Динамика по месяцам">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={analytics.monthly}>
              <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                stroke="#888"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="#888" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "#0d0d0d",
                  border: "1px solid #262626",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ fill: "#6366f1", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="По категориям">
          {analytics.byCategory.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={analytics.byCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry: { name?: string; value?: number }) =>
                    `${entry.name ?? ""}: ${entry.value ?? 0}`
                  }
                  labelLine={false}
                >
                  {analytics.byCategory.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid #262626",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="По приоритету">
          {analytics.byPriority.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.byPriority}>
                <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" />
                <XAxis dataKey="priority" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid #262626",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Топ-5 проблемных мест">
          {analytics.topDistricts.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-2 text-sm">
              {analytics.topDistricts.map((d, idx) => (
                <li
                  key={d.district}
                  className="flex items-center justify-between rounded-lg border border-white/5 bg-black/30 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                      {idx + 1}
                    </span>
                    <span className="text-zinc-200">{d.district}</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-400">
                    {d.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "indigo" | "emerald" | "muted";
}) {
  const tones: Record<string, string> = {
    indigo: "text-indigo-300",
    emerald: "text-emerald-300",
    muted: "text-zinc-300",
  };
  return (
    <div className="rounded-2xl border border-app bg-surface p-5">
      <div className="text-xs uppercase tracking-wide text-muted-app">
        {label}
      </div>
      <div className={`mt-1 text-3xl font-semibold ${tone ? tones[tone] : "text-app"}`}>
        {value}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-app bg-surface p-5">
      <h3 className="mb-4 text-sm font-medium text-app">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-app">
      Недостаточно данных
    </div>
  );
}

function PredictionCard({
  prediction,
  loading,
}: {
  prediction: PredictionData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-app bg-surface p-5 text-sm text-muted-app">
        <Loader2 className="h-4 w-4 animate-spin" />
        Готовим прогноз...
      </div>
    );
  }

  if (!prediction) return null;

  const TrendIcon =
    prediction.trend === "rising"
      ? TrendingUp
      : prediction.trend === "falling"
        ? TrendingDown
        : Activity;
  const trendLabel =
    prediction.trend === "rising"
      ? "Рост"
      : prediction.trend === "falling"
        ? "Снижение"
        : "Стабильно";
  const trendColor =
    prediction.trend === "rising"
      ? "text-red-300 bg-red-500/10"
      : prediction.trend === "falling"
        ? "text-emerald-300 bg-emerald-500/10"
        : "text-zinc-300 bg-white/5";

  return (
    <div className="rounded-2xl border border-app bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 accent-app" />
        <h3 className="text-base font-semibold text-app">ИИ-прогноз на завтра</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-app">
            Ожидается жалоб
          </div>
          <div className="mt-1 text-4xl font-bold text-app">
            ~{prediction.expectedTomorrow}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-app">
            <Clock className="h-3 w-3" />
            На основе последних {prediction.basedOnDays} дней (
            {prediction.total7d} жалоб)
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-app">
            Тренд
          </div>
          <div
            className={`mt-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${trendColor}`}
          >
            <TrendIcon className="h-4 w-4" />
            {trendLabel}
          </div>
          {prediction.spikeCategory && (
            <div className="mt-2 text-xs text-muted-app">
              Возможный всплеск:{" "}
              <span className="text-app">{prediction.spikeCategory}</span>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-app">
            Обоснование
          </div>
          <p className="mt-1 text-sm text-app">{prediction.reasoning}</p>
        </div>
      </div>
    </div>
  );
}
