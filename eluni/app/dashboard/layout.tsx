import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, BarChart3, LogOut, ShieldCheck } from "lucide-react";
import { getCurrentUser, ROLE_TO_ORG } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const org = ROLE_TO_ORG[user.role];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-gray-900/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">{user.displayName}</div>
              <div className="text-xs text-zinc-400">Орган: {org}</div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/10"
            >
              <LayoutDashboard className="h-4 w-4" />
              Проблемы
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-200 transition hover:bg-white/10"
            >
              <BarChart3 className="h-4 w-4" />
              Аналитика
            </Link>
            <a
              href="/api/auth/logout"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-red-300 transition hover:bg-red-500/20"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
