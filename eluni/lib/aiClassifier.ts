import Groq from "groq-sdk";

export type Category =
  | "Энергетика"
  | "Дороги"
  | "Мусор"
  | "Вода"
  | "Транспорт"
  | "Связь"
  | "Безопасность"
  | "Другое";

export type Priority = "Высокий" | "Средний" | "Низкий";

export type AssignedTo =
  | "МВД"
  | "ГАИ"
  | "Тазалык"
  | "Бишкекводоканал"
  | "Бишкектеплосеть"
  | "Мэрия";

export interface ClassificationResult {
  category: Category;
  priority: Priority;
  assignedTo: AssignedTo;
  officialText: string;
}

const SYSTEM_PROMPT = `Ты — AI-классификатор и редактор городских жалоб для государственных органов Кыргызстана.

Верни ТОЛЬКО валидный JSON в следующем формате (без markdown, без комментариев):
{
  "category": "Энергетика" | "Дороги" | "Мусор" | "Вода" | "Транспорт" | "Связь" | "Безопасность" | "Другое",
  "priority": "Высокий" | "Средний" | "Низкий",
  "assignedTo": "МВД" | "ГАИ" | "Тазалык" | "Бишкекводоканал" | "Бишкектеплосеть" | "Мэрия",
  "officialText": "переписанный текст в официальном стиле (от третьего лица, без эмоций, конструктивно)"
}

ПРАВИЛА МАРШРУТИЗАЦИИ:
- МВД: кражи, драки, подозрительные лица, вандализм, угрозы, наркотики, домашнее насилие.
- ГАИ: нарушения ПДД, пробки, шумные авто, неправильная парковка, аварии.
- Тазалык: мусор, свалки, уборка территории, непорядок в общественных местах.
- Бишкекводоканал: прорыв воды, слабый напор, отключение воды, канализация.
- Бишкектеплосеть: проблемы с отоплением, отсутствие горячей воды.
- Мэрия: всё остальное (благоустройство, освещение, городская инфраструктура).

ПРАВИЛА ПЕРЕПИСЫВАНИЯ officialText:
- Убрать мат, эмоции, оскорбления, разговорный стиль.
- Переписать в деловом стиле от третьего лица.
- Сохранить суть и местоположение (адреса, названия улиц).
- Использовать конструкции: "зафиксировано", "обнаружено", "просим организовать", "необходимо принять меры".
- Пример: "блять мусор на киевской лежит уже 2 дня уберите" → "На улице Киевской зафиксировано скопление мусора в течение двух дней. Просим организовать уборку территории."

ПРАВИЛА ПРИОРИТЕТА:
- Высокий: угроза жизни/здоровью, авария, перекрытие дороги, массовое отключение коммунальных услуг, преступление в процессе.
- Средний: значительные неудобства, проблема не решается длительное время, влияет на многих людей.
- Низкий: мелкие проблемы, информационные сообщения, единичные неудобства.

КЛЮЧЕВЫЕ КАТЕГОРИИ:
- Энергетика: электричество, освещение улиц, ЛЭП.
- Дороги: ямы, разметка, состояние дорожного полотна.
- Мусор: свалки, переполненные контейнеры, грязь.
- Вода: водоснабжение, канализация, прорывы.
- Транспорт: общественный транспорт, маршрутки, расписание.
- Связь: интернет, телефония, мобильная связь.
- Безопасность: преступления, подозрительная активность, опасные ситуации.
- Другое: всё, что не подходит выше.`;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const VALID_CATEGORIES: Category[] = [
  "Энергетика",
  "Дороги",
  "Мусор",
  "Вода",
  "Транспорт",
  "Связь",
  "Безопасность",
  "Другое",
];
const VALID_PRIORITIES: Priority[] = ["Высокий", "Средний", "Низкий"];
const VALID_ASSIGNEES: AssignedTo[] = [
  "МВД",
  "ГАИ",
  "Тазалык",
  "Бишкекводоканал",
  "Бишкектеплосеть",
  "Мэрия",
];

function sanitize(parsed: unknown, fallbackText: string): ClassificationResult {
  const obj = (parsed ?? {}) as Record<string, unknown>;

  const category = VALID_CATEGORIES.includes(obj.category as Category)
    ? (obj.category as Category)
    : "Другое";
  const priority = VALID_PRIORITIES.includes(obj.priority as Priority)
    ? (obj.priority as Priority)
    : "Средний";
  const assignedTo = VALID_ASSIGNEES.includes(obj.assignedTo as AssignedTo)
    ? (obj.assignedTo as AssignedTo)
    : "Мэрия";
  const officialText =
    typeof obj.officialText === "string" && obj.officialText.trim().length > 0
      ? (obj.officialText as string)
      : fallbackText;

  return { category, priority, assignedTo, officialText };
}

export async function classifyComplaint(
  text: string
): Promise<ClassificationResult> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY не задан. Добавьте его в .env.local и перезапустите сервер."
    );
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Текст жалобы гражданина:\n"""\n${text}\n"""\n\nВерни строго JSON.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  return sanitize(parsed, text);
}
