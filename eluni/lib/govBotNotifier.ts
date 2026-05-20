/**
 * Уведомления госслужащим через Telegram-бота для госслужащих
 * (`@ElUniGovBot`, токен `GOV_TELEGRAM_BOT_TOKEN`).
 *
 * Используем Telegram Bot HTTP API напрямую, чтобы не поднимать
 * long-polling/Bot-инстанс внутри Next.js API-роутов.
 */

interface AssignmentPayload {
  telegramUserId: string;
  complaintId: string;
  category: string;
  priority: string;
  address: string | null;
  officialText: string;
}

/**
 * Отправка уведомления о назначении жалобы.
 * Использует `GOV_TELEGRAM_BOT_TOKEN`. Возвращает `{ok}` без выброса исключений,
 * чтобы вызывающие API не падали из-за временной недоступности Telegram.
 */
export async function sendGovAssignment(
  payload: AssignmentPayload
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.GOV_TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "GOV_TELEGRAM_BOT_TOKEN не задан" };
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
