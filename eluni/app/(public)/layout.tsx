import Link from "next/link";
import { ShieldCheck, Send, Search } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
            <span>ElUni</span>
          </Link>
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <Send className="h-4 w-4" />
              Подать жалобу
            </Link>
            <Link
              href="/track"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <Search className="h-4 w-4" />
              Отследить
            </Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-zinc-500">
        ElUni · MVP · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
