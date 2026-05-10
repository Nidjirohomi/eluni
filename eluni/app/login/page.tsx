"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Loader2, AlertCircle, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      router.push(from.startsWith("/dashboard") ? from : "/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось войти в систему."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-indigo-400" />
        <h1 className="text-2xl font-semibold tracking-tight">
          Кабинет госслужащего
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6"
      >
        <div>
          <label
            htmlFor="username"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Логин
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="mvd"
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-zinc-300"
          >
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••"
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            required
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !username.trim() || !password}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Входим...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Войти
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-zinc-400">
        <div className="mb-2 font-medium text-zinc-300">
          Тестовые аккаунты (пароль <code className="text-indigo-300">123123</code>)
        </div>
        <div className="grid grid-cols-2 gap-1 font-mono">
          <span>mvd</span>
          <span className="text-zinc-500">МВД</span>
          <span>gai</span>
          <span className="text-zinc-500">ГАИ</span>
          <span>tazalyk</span>
          <span className="text-zinc-500">Тазалык</span>
          <span>vodokanal</span>
          <span className="text-zinc-500">Бишкекводоканал</span>
          <span>teploset</span>
          <span className="text-zinc-500">Бишкектеплосеть</span>
          <span>meria</span>
          <span className="text-zinc-500">Мэрия</span>
        </div>
      </div>
    </div>
  );
}
