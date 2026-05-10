import { Bot, Context } from "grammy";

interface PendingMedia {
  text: string;
  mediaUrls: string[];
  lat?: number;
  lng?: number;
  address?: string;
  timer?: NodeJS.Timeout;
}

// Буфер для группировки альбомов и текстов перед отправкой в API
const pendingByUser = new Map<number, PendingMedia>();
const FLUSH_DELAY_MS = 1500;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getOrInit(userId: number): PendingMedia {
  let entry = pendingByUser.get(userId);
  if (!entry) {
    entry = { text: "", mediaUrls: [] };
    pendingByUser.set(userId, entry);
  }
  return entry;
}

async function fileLink(bot: Bot, fileId: string): Promise<string | null> {
  try {
    const file = await bot.api.getFile(fileId);
    if (!file.file_path) return null;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return null;
    return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  } catch (err) {
    console.error("[telegramBot] getFile error:", err);
    return null;
  }
}

async function submit(ctx: Context, entry: PendingMedia) {
  const userId = ctx.from?.id;
  if (!userId) return;
  pendingByUser.delete(userId);

  if (!entry.text && entry.mediaUrls.length === 0) {
    await ctx.reply("Не удалось распознать обращение. Попробуйте ещё раз.");
    return;
  }

  const finalText = entry.text || "Обращение с медиа-вложением (без текста).";

  try {
    const res = await fetch(`${APP_URL}/api/complaints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: finalText,
        address: entry.address ?? null,
        lat: entry.lat ?? null,
        lng: entry.lng ?? null,
        mediaUrls: entry.mediaUrls.length > 0 ? entry.mediaUrls : null,
        source: "telegram",
        telegramUserId: String(userId),
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg =
        (errBody as { error?: string }).error ?? `HTTP ${res.status}`;
      await ctx.reply(`Не удалось обработать обращение: ${msg}`);
      return;
    }

    const data = (await res.json()) as {
      id: string;
      category: string;
      priority: string;
      assignedTo: string;
      officialText: string;
    };

    await ctx.reply(
      [
        "✅ Ваше обращение принято.",
        "",
        `🏛 Орган: ${data.assignedTo}`,
        `📂 Категория: ${data.category}`,
        `⚡ Приоритет: ${data.priority}`,
        "",
        "📝 Официальная формулировка:",
        data.officialText,
        "",
        `🔍 ID для отслеживания: ${data.id}`,
      ].join("\n")
    );
  } catch (err) {
    console.error("[telegramBot] submit error:", err);
    await ctx.reply(
      "Сервис временно недоступен. Попробуйте отправить обращение чуть позже."
    );
  }
}

function scheduleFlush(ctx: Context, entry: PendingMedia) {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    void submit(ctx, entry);
  }, FLUSH_DELAY_MS);
}

let _bot: Bot | null = null;

export function getBot(): Bot {
  if (_bot) return _bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN не задан. Добавьте его в .env.local перед запуском бота."
    );
  }

  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      [
        "Добрый день! 👋",
        "",
        "Я — бот ElUni для приёма обращений граждан.",
        "",
        "Опишите проблему текстом, отправьте фото/видео, геолокацию или укажите адрес в сообщении.",
        "AI-классификатор сам определит категорию, приоритет и нужный госорган.",
        "",
        "Команды:",
        "/start — это сообщение",
        "/help — помощь",
      ].join("\n")
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "Просто опишите проблему. Можно прикрепить фото, видео и геолокацию."
    );
  });

  bot.on("message:photo", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const entry = getOrInit(userId);

    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];
    if (largest) {
      const link = await fileLink(bot, largest.file_id);
      if (link) entry.mediaUrls.push(link);
    }

    const caption = ctx.message.caption?.trim();
    if (caption) {
      entry.text = entry.text ? `${entry.text}\n${caption}` : caption;
    }

    scheduleFlush(ctx, entry);
  });

  bot.on("message:video", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const entry = getOrInit(userId);

    const video = ctx.message.video;
    const link = await fileLink(bot, video.file_id);
    if (link) entry.mediaUrls.push(link);

    const caption = ctx.message.caption?.trim();
    if (caption) {
      entry.text = entry.text ? `${entry.text}\n${caption}` : caption;
    }

    scheduleFlush(ctx, entry);
  });

  bot.on("message:location", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const entry = getOrInit(userId);

    entry.lat = ctx.message.location.latitude;
    entry.lng = ctx.message.location.longitude;

    scheduleFlush(ctx, entry);
  });

  bot.on("message:text", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const text = ctx.message.text.trim();
    if (!text || text.startsWith("/")) return;

    const entry = getOrInit(userId);
    entry.text = entry.text ? `${entry.text}\n${text}` : text;

    scheduleFlush(ctx, entry);
  });

  bot.catch((err) => {
    console.error("[telegramBot] bot error:", err);
  });

  _bot = bot;
  return bot;
}
