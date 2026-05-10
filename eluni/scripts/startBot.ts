import { config } from "dotenv";
import { getBot } from "../lib/telegramBot";

// Загружаем переменные окружения из .env.local и .env (как делает Next.js)
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error(
      "❌ TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env.local перед запуском."
    );
    process.exit(1);
  }

  const bot = getBot();
  console.log("🤖 Telegram-бот ElUni запускается (long-polling)...");

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  await bot.start({
    onStart: (info) => {
      console.log(`✅ Бот запущен как @${info.username}`);
    },
  });
}

main().catch((err) => {
  console.error("Не удалось запустить бота:", err);
  process.exit(1);
});
