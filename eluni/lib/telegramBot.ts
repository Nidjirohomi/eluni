import { Bot, Context, InlineKeyboard } from "grammy";
import { db, type ComplaintModel } from "@/lib/models";

// ─── Типы ───────────────────────────────────────────────────────────────

interface PendingMedia {
  text: string;
  mediaUrls: string[];
  lat?: number;
  lng?: number;
  address?: string;
  timer?: NodeJS.Timeout;
}

type Lang = "ru" | "kg";

interface AcceptedData {
  id: string;
  assignedTo: string;
  category: string;
  priority: string;
  officialText: string;
}

interface LangPack {
  chooseLang: string;
  langSaved: string;
  welcome: string;
  help: string;
  needLocation: string;
  tooShort: string;
  banned: string;
  limitReached: string;
  notRecognized: string;
  serviceDown: string;
  submitFail: (msg: string) => string;
  accepted: (d: AcceptedData) => string;
  statusNone: string;
  statusTitle: string;
  statusItem: (
    id: string,
    category: string,
    emoji: string,
    label: string
  ) => string;
  statusLabel: Record<string, string>;
}

// ─── Конфигурация ───────────────────────────────────────────────────────

const FLUSH_DELAY_MS = 1500;
const DAILY_LIMIT = 2;
const MIN_TEXT = 20;
const MAX_TEXT = 500;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Запрещённые корни слов — проверка делается case-insensitive по подстроке,
// поэтому достаточно указать «корень» (например, «пизд» поймает все формы).
const BANNED_WORDS: readonly string[] = [
  // Русский мат (корни форм).
  "блять",
  "бляд",
  "сука",
  "сучк",
  "пизд",
  "пезд",
  "хуй",
  "хуе",
  "хуё",
  "хуи",
  "ебать",
  "ебан",
  "ёбан",
  "еба",
  "ёба",
  "нахуй",
  "пиздец",
  "мудак",
  "мудил",
  "гондон",
  "шлюх",
  "шлюш",
  "залуп",
  "далбаёб",
  "далбаеб",
  "долбоёб",
  "долбоеб",
  "пидор",
  "пидар",
  "уебок",
  "уёбок",
  "выеб",
  // Спам / реклама.
  "casino",
  "казино",
  "viagra",
  "виагра",
  "лохотрон",
  "ставки на",
  "1xbet",
  "bet365",
  "forex",
  "крипт",
  "майнинг",
];

// ─── Состояние пользователя в памяти процесса ───────────────────────────

const pendingByUser = new Map<number, PendingMedia>();
const userLang = new Map<number, Lang>();
const userDailyCount = new Map<number, { count: number; date: string }>();

// ─── Локализация ────────────────────────────────────────────────────────

const T: Record<Lang, LangPack> = {
  ru: {
    chooseLang: "Выберите язык / Тилди тандаңыз:",
    langSaved: "✅ Язык сохранён: Русский",
    welcome: [
      "Добрый день! 👋",
      "",
      "Я — анонимный канал ElUni для приёма обращений граждан.",
      "Опишите проблему текстом, прикрепите фото/видео и обязательно укажите адрес или пришлите геопозицию.",
      "",
      "Правила:",
      `• Описание — от ${MIN_TEXT} до ${MAX_TEXT} символов.`,
      "• Адрес текстом или геолокация обязательны.",
      `• Не более ${DAILY_LIMIT} обращений в сутки с одного пользователя.`,
      "• Спам и оскорбительные выражения автоматически отклоняются.",
      "",
      "Команды:",
      "/start — это сообщение",
      "/status — мои последние обращения",
      "/help — помощь",
    ].join("\n"),
    help: "Опишите проблему текстом. Можно прикрепить фото, видео и геолокацию. После короткой паузы я отправлю обращение в нужный госорган.",
    needLocation: [
      "📍 Чтобы принять обращение, нужна геолокация.",
      "",
      "Пришлите геопозицию (📎 → «Геопозиция») или укажите адрес текстом.",
    ].join("\n"),
    tooShort: `Слишком короткое описание. Минимум ${MIN_TEXT} символов.`,
    banned: "Обращение содержит недопустимые выражения. Переформулируйте.",
    limitReached: `Вы исчерпали лимит на сегодня (${DAILY_LIMIT} обращения). Попробуйте завтра.`,
    notRecognized: "Не удалось распознать обращение. Попробуйте ещё раз.",
    serviceDown:
      "Сервис временно недоступен. Попробуйте отправить обращение чуть позже.",
    submitFail: (msg) => `Не удалось обработать обращение: ${msg}`,
    accepted: (d) =>
      [
        "✅ Ваше обращение принято.",
        "",
        `🏛 Орган: ${d.assignedTo}`,
        `📂 Категория: ${d.category}`,
        `⚡ Приоритет: ${d.priority}`,
        "",
        "📝 Официальная формулировка:",
        d.officialText,
        "",
        `🔍 ID для отслеживания: ${d.id}`,
      ].join("\n"),
    statusNone: "У вас пока нет обращений.",
    statusTitle: "Ваши последние обращения:",
    statusItem: (id, category, emoji, label) =>
      `${emoji} ${id} · ${category} — ${label}`,
    statusLabel: {
      pending: "ожидает",
      in_progress: "в работе",
      resolved: "решено",
    },
  },
  kg: {
    chooseLang: "Выберите язык / Тилди тандаңыз:",
    langSaved: "✅ Тил сакталды: Кыргызча",
    welcome: [
      "Кутмандуу күн! 👋",
      "",
      "Мен — ElUni жарандардан кайрылууларды кабыл алуучу анонимдик канал.",
      "Маселени текст менен жазып, сүрөт/видео тиркеп, дарек же геопозиция жибериңиз.",
      "",
      "Эрежелер:",
      `• Сүрөттөмө — ${MIN_TEXT} дөн ${MAX_TEXT} белгиге чейин.`,
      "• Дарек же геолокация милдеттүү.",
      `• Бир сутка ичинде эң көп ${DAILY_LIMIT} кайрылуу.`,
      "• Спам жана адепсиз сөздөр автоматтык түрдө четке кагылат.",
      "",
      "Буйруктар:",
      "/start — бул билдирүү",
      "/status — менин акыркы кайрылууларым",
      "/help — жардам",
    ].join("\n"),
    help: "Маселени текст менен жазыңыз. Сүрөт, видео жана геолокация тиркесе болот. Кыска тыныгуудан кийин кайрылууну тиешелүү органга жөнөтөмүн.",
    needLocation: [
      "📍 Кайрылууну кабыл алуу үчүн геолокация керек.",
      "",
      "Геопозицияны жибериңиз (📎 → «Геопозиция») же даректи текст менен көрсөтүңүз.",
    ].join("\n"),
    tooShort: `Сүрөттөмө өтө кыска. Минимум ${MIN_TEXT} белги.`,
    banned: "Кайрылууда жараксыз сөздөр бар. Кайра жазыңыз.",
    limitReached: `Сиз бүгүнкү лимитти түгөттүңүз (${DAILY_LIMIT} кайрылуу). Эртең аракет кылыңыз.`,
    notRecognized: "Кайрылууну тааный албадым. Кайра жибериңиз.",
    serviceDown:
      "Сервис убактылуу жеткиликсиз. Бир аздан кийин аракет кылыңыз.",
    submitFail: (msg) => `Кайрылууну иштетүү ишке ашкан жок: ${msg}`,
    accepted: (d) =>
      [
        "✅ Сиздин кайрылууңуз кабыл алынды.",
        "",
        `🏛 Орган: ${d.assignedTo}`,
        `📂 Категория: ${d.category}`,
        `⚡ Артыкчылык: ${d.priority}`,
        "",
        "📝 Расмий формулировка:",
        d.officialText,
        "",
        `🔍 Көзөмөл үчүн ID: ${d.id}`,
      ].join("\n"),
    statusNone: "Сизде азырынча кайрылуулар жок.",
    statusTitle: "Сиздин акыркы кайрылууларыңыз:",
    statusItem: (id, category, emoji, label) =>
      `${emoji} ${id} · ${category} — ${label}`,
    statusLabel: {
      pending: "күтүүдө",
      in_progress: "иштелүүдө",
      resolved: "чечилди",
    },
  },
};

// ─── Утилиты ────────────────────────────────────────────────────────────

/** Язык пользователя; если не выбран — по умолчанию русский. */
function langOf(userId: number | undefined): Lang {
  if (!userId) return "ru";
  return userLang.get(userId) ?? "ru";
}

/** Ключ «сегодняшней» даты в локальном времени процесса. */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getDailyCount(userId: number): number {
  const entry = userDailyCount.get(userId);
  if (!entry || entry.date !== todayKey()) return 0;
  return entry.count;
}

function incDailyCount(userId: number) {
  const today = todayKey();
  const entry = userDailyCount.get(userId);
  if (!entry || entry.date !== today) {
    userDailyCount.set(userId, { count: 1, date: today });
  } else {
    entry.count += 1;
  }
}

/** Проверка по подстроке (case-insensitive) на запрещённые слова. */
function containsBanned(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

function statusEmoji(status: string): string {
  if (status === "in_progress") return "🔧";
  if (status === "resolved") return "✅";
  return "⏳";
}

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

// ─── Отправка обращения ─────────────────────────────────────────────────

async function submit(ctx: Context, entry: PendingMedia) {
  const userId = ctx.from?.id;
  if (!userId) return;
  const t = T[langOf(userId)];

  // Пустой буфер — нечего отправлять.
  if (!entry.text && entry.mediaUrls.length === 0) {
    pendingByUser.delete(userId);
    await ctx.reply(t.notRecognized);
    return;
  }

  // Валидация длины пользовательского текста.
  // Если пользователь прислал текст — он должен быть не короче MIN_TEXT.
  // Если текста нет, но есть медиа — пропускаем (используем дефолтную формулировку).
  if (entry.text) {
    if (entry.text.length < MIN_TEXT) {
      // НЕ удаляем буфер, чтобы пользователь мог дописать.
      await ctx.reply(t.tooShort);
      return;
    }
    if (containsBanned(entry.text)) {
      pendingByUser.delete(userId);
      await ctx.reply(t.banned);
      return;
    }
    // Тихая обрезка слишком длинных описаний.
    if (entry.text.length > MAX_TEXT) {
      entry.text = entry.text.slice(0, MAX_TEXT);
    }
  }

  // Адрес обязателен. Если его нет — просим локацию и НЕ удаляем буфер,
  // чтобы пользователь мог прислать координаты следующим сообщением.
  const hasCoords =
    typeof entry.lat === "number" && typeof entry.lng === "number";
  const hasAddress = !!(entry.address && entry.address.trim());
  if (!hasAddress && !hasCoords) {
    await ctx.reply(t.needLocation);
    return;
  }

  // Дневной лимит.
  if (getDailyCount(userId) >= DAILY_LIMIT) {
    pendingByUser.delete(userId);
    await ctx.reply(t.limitReached);
    return;
  }

  pendingByUser.delete(userId);
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
      await ctx.reply(t.submitFail(msg));
      return;
    }

    const data = (await res.json()) as AcceptedData;

    // Инкрементируем счётчик ТОЛЬКО после успешной отправки.
    incDailyCount(userId);

    await ctx.reply(t.accepted(data));
  } catch (err) {
    console.error("[telegramBot] submit error:", err);
    await ctx.reply(t.serviceDown);
  }
}

function scheduleFlush(ctx: Context, entry: PendingMedia) {
  if (entry.timer) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => {
    void submit(ctx, entry);
  }, FLUSH_DELAY_MS);
}

// ─── Бот ────────────────────────────────────────────────────────────────

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

  // /start: при первом запуске — выбор языка кнопками; при повторном — сразу приветствие.
  bot.command("start", async (ctx) => {
    const userId = ctx.from?.id;
    if (userId && userLang.has(userId)) {
      await ctx.reply(T[langOf(userId)].welcome);
      return;
    }
    const kb = new InlineKeyboard()
      .text("🇷🇺 Русский", "lang:ru")
      .text("🇰🇬 Кыргызча", "lang:kg");
    await ctx.reply(T.ru.chooseLang, { reply_markup: kb });
  });

  // Обработка нажатий по кнопкам выбора языка.
  bot.callbackQuery(/^lang:(ru|kg)$/, async (ctx) => {
    // ctx.match при regex-фильтре — это RegExpMatchArray; первая группа — код языка.
    const matched = Array.isArray(ctx.match) ? ctx.match[1] : undefined;
    const lang: Lang = matched === "kg" ? "kg" : "ru";
    const userId = ctx.from?.id;
    if (userId) {
      userLang.set(userId, lang);
    }
    await ctx.answerCallbackQuery();
    // Уберём клавиатуру у предыдущего сообщения, чтобы её нельзя было нажать снова.
    try {
      await ctx.editMessageReplyMarkup();
    } catch {
      /* сообщение могло быть уже отредактировано / удалено — игнорируем */
    }
    await ctx.reply(T[lang].langSaved);
    await ctx.reply(T[lang].welcome);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(T[langOf(ctx.from?.id)].help);
  });

  // /status: последние 5 жалоб с этого Telegram-аккаунта.
  bot.command("status", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const t = T[langOf(userId)];

    try {
      const items = (await db.complaint.findMany({
        where: { telegramUserId: String(userId) },
        orderBy: { createdAt: "desc" },
        take: 5,
      })) as ComplaintModel[];

      if (!items || items.length === 0) {
        await ctx.reply(t.statusNone);
        return;
      }

      const lines = items.map((c) => {
        const shortId = c.id.slice(-6);
        const label = t.statusLabel[c.status] ?? c.status;
        return t.statusItem(shortId, c.category, statusEmoji(c.status), label);
      });

      await ctx.reply([t.statusTitle, "", ...lines].join("\n"));
    } catch (err) {
      console.error("[telegramBot] /status error:", err);
      await ctx.reply(t.serviceDown);
    }
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
