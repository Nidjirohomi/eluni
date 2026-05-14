/**
 * Отправка уведомлений сотрудникам через Telegram-бота (без long-polling зависимости).
 * Используем Telegram Bot HTTP API напрямую — это позволяет уведомлять из API-роутов
 * без необходимости запускать grammy-инстанс.
 */

interface AssignmentPayload {
  telegramUserId: string;
  complaintId: string;
  category: string;
  priority: string;
  address: string | null;
  officialText: string;
}

export async function sendAssignmentNotification(
  payload: AssignmentPayload
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN не задан" };
  }
  if (!payload.telegramUserId) {
    return { ok: false, error: "Нет telegramUserId у сотрудника" };
  }

  const text = [
    "🚨 *Вам назначена жалоба*",
    "",
    `🆔 ID: \`${payload.complaintId}\``,
    `📂 Категория: ${payload.category}`,
    `⚡ Приоритет: ${payload.priority}`,
    payload.address ? `📍 Адрес: ${payload.address}` : null,
    "",
    "📝 Суть:",
    payload.officialText.slice(0, 600),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: payload.telegramUserId,
          text,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Telegram API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
