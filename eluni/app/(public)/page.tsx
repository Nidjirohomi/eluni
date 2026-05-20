import { CitizenComplaintForm } from "./CitizenComplaintForm";
import { CitizenLoginGate } from "./CitizenLoginGate";
import { getCurrentUser, isCitizen } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Серверный гейт публичной формы:
 *   - если пользователь не авторизован  → показываем заглушку
 *     с предложением войти через Түндүк или Telegram-бота;
 *   - если авторизован как гражданин   → форма подачи жалобы;
 *   - если авторизован как госслужащий → подсказка, что подавать жалобы
 *     надо из гражданского аккаунта.
 *
 * Анонимные жалобы принимаются ТОЛЬКО через Telegram-бота.
 */
export default async function HomePage() {
  // Вызов headers() — гарантия, что страница рендерится динамически
  // и cookie-сессия читается на каждый запрос.
  headers();
  const me = await getCurrentUser();

  if (!me) {
    return <CitizenLoginGate variant="anonymous" />;
  }
  if (!isCitizen(me.role)) {
    return <CitizenLoginGate variant="staff" />;
  }

  return <CitizenHome displayName={me.displayName} />;
}

function CitizenHome({ displayName }: { displayName: string }) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Вход через Түндүк: {displayName}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Подать обращение
        </h1>
        <p className="mt-3 max-w-2xl text-muted-app">
          Опишите проблему, укажите адрес на карте и при необходимости
          прикрепите фото или видео. AI-классификатор сам определит категорию,
          приоритет и направит жалобу нужному органу.
        </p>
      </section>

      <CitizenComplaintForm />
    </div>
  );
}

// Старая клиентская реализация формы вынесена в `./CitizenComplaintForm.tsx`.
