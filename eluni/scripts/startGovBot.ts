import { config } from "dotenv";
import { getGovBot } from "../lib/govBot";

// Загружаем переменные окружения из .env.local и .env (как делает Next.js).
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  if (!process.env.GOV_TELEGRAM_BOT_TOKEN) {
    console.error(
      "❌ GOV_TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env.local перед запуском."
    );
    process.exit(1);
  }

  const bot = getGovBot();
  console.log("🤖 Telegram-бот ElUni (для госслужащих) запускается (long-polling)...");

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  await bot.start({
    onStart: (info) => {
      console.log(`✅ Gov-бот запущен как @${info.username}`);
    },
  });
}

main().catch((err) => {
  console.error("Не удалось запустить gov-бота:", err);
  process.exit(1);
});
