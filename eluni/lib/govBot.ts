import { Bot } from "grammy";
import { db, type UserModel } from "@/lib/models";

/**
 * Отдельный Telegram-бот для госслужащих ElUni.
 *
 * Назначение:
 *   1) /bind <код> — привязка Telegram-аккаунта сотрудника к его профилю в системе
 *      (код выдаётся в личном кабинете на вкладке «Профиль»).
 *   2) Канал доставки уведомлений о назначенных делах (через HTTP API без long-polling
 *      см. `lib/govBotNotifier.ts`).
 *
 * Запуск long-polling: `npm run gov-bot` (см. scripts/startGovBot.ts).
 * Токен берётся из env `GOV_TELEGRAM_BOT_TOKEN`.
 */

let _bot: Bot | null = null;

export function getGovBot(): Bot {
  if (_bot) return _bot;

  const token = process.env.GOV_TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "GOV_TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env.local."
    );
  }

  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "👋 Это служебный бот ElUni для госслужащих.",
        "",
        "Здесь вы будете получать уведомления о назначенных вам делах.",
        "",
        "Чтобы привязать ваш аккаунт, отправьте команду:",
        "`/bind <ваш_код>`",
        "",
        "Код находится в личном кабинете: «Профиль» → «Привязать Telegram».",
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "Команды бота:",
        "/bind <код> — привязать ваш аккаунт по коду из личного кабинета.",
        "/help — это сообщение.",
      ].join("\n")
    );
  });

  bot.command("bind", async (ctx) => {
    const raw = ctx.match?.toString().trim() ?? "";
    const code = raw.replace(/\s+/g, "").toUpperCase();

    if (!code) {
      await ctx.reply(
        "❗ Использование: `/bind <код>`\nКод можно получить в личном кабинете.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    const tgId = ctx.from?.id ? String(ctx.from.id) : "";
    if (!tgId) {
      await ctx.reply("❌ Не удалось определить ваш Telegram ID.");
      return;
    }

    try {
      const user = (await db.user.findUnique({
        where: { bindToken: code },
      })) as UserModel | null;

      if (!user) {
        await ctx.reply(
          "❌ Неверный код. Проверьте код в личном кабинете и попробуйте снова."
        );
        return;
      }

      // Уже привязан другой Telegram-аккаунт — считаем код использованным.
      if (user.telegramUserId && user.telegramUserId !== tgId) {
        await ctx.reply(
          "❌ Этот код уже использован для привязки другого Telegram-аккаунта. Обратитесь к администратору."
        );
        return;
      }

      // Если уже привязан тот же самый Telegram — сообщаем, что всё хорошо.
      if (user.telegramUserId === tgId) {
        await ctx.reply(
          `✅ Ваш Telegram уже привязан к аккаунту ${user.displayName}.`
        );
        return;
      }

      await db.user.update({
        where: { id: user.id },
        data: { telegramUserId: tgId },
      });

      await ctx.reply(
        [
          "✅ Telegram привязан. Вы будете получать уведомления о назначенных делах.",
          "",
          `👤 Аккаунт: ${user.displayName}`,
        ].join("\n")
      );
    } catch (err) {
      console.error("[govBot] /bind error:", err);
      await ctx.reply("❌ Внутренняя ошибка. Попробуйте позже.");
    }
  });

  // Любое некомандное сообщение — короткая подсказка.
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) return;
    await ctx.reply(
      "Я понимаю только команду /bind <код>. Введите /help для справки."
    );
  });

  bot.catch((err) => {
    console.error("[govBot] error:", err);
  });

  _bot = bot;
  return bot;
}
