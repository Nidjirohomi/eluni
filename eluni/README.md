# ElUni — приём городских жалоб

Платформа для приёма обращений граждан с AI-классификацией (Groq + Llama 3.3 70B), переписыванием в официальный стиль и маршрутизацией в государственные органы Кыргызстана.

## Стек

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (тёмная тема)
- **Prisma + SQLite**
- **Groq SDK** — модель `llama-3.3-70b-versatile`
- **grammy** — Telegram-бот

## Быстрый старт с нуля

```bash
# 1. Клонирование
git clone <ваш_url> eluni
cd eluni

# 2. Зависимости
npm install

# 3. Переменные окружения — скопируйте шаблон и впишите реальные ключи
cp .env.example .env.local        # macOS / Linux
# Copy-Item .env.example .env.local  # Windows PowerShell

# 4. Создаём локальную базу SQLite по текущей schema.prisma
npx prisma db push

# 5. Заполняем базу тестовыми данными (6 госслужащих + 6 жалоб)
npm run seed

# 6. Запускаем dev-сервер
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

Telegram-бот (long-polling, отдельным процессом):

```bash
npm run bot
```

## Переменные окружения

Шаблон в репозитории — `.env.example`. Скопируйте его в `.env.local` и впишите реальные ключи:

| Переменная | Обязательна? | Описание |
| --- | --- | --- |
| `GROQ_API_KEY` | да | Ключ [console.groq.com](https://console.groq.com/keys) — AI-классификация жалоб. |
| `JWT_SECRET` | да | Секрет для подписи cookie входа. Минимум 16 символов. |
| `DATABASE_URL` | да | `"file:./dev.db"` — локальная SQLite. Менять не нужно. |
| `TELEGRAM_BOT_TOKEN` | нет | Токен бота от [@BotFather](https://t.me/BotFather), если нужен Telegram-канал. |

Файлы `.env`, `.env.local` и `prisma/dev.db` в git не попадают (см. `.gitignore`).

## Полезные команды

```bash
npm run dev      # next dev (порт 3000)
npm run build    # production-сборка
npm run start    # запуск production-сборки
npm run seed     # перезаполнить базу тестовыми данными (очищает Complaint и User)
npm run bot      # телеграм-бот long-polling
```

## Кабинет госслужащего

Страница входа: [http://localhost:3000/login](http://localhost:3000/login).

Тестовые аккаунты (пароль у всех `123123`):

| Логин | Орган |
| --- | --- |
| `mvd` | МВД |
| `gai` | ГАИ |
| `tazalyk` | Тазалык |
| `vodokanal` | Бишкекводоканал |
| `teploset` | Бишкектеплосеть |
| `meria` | Мэрия |

Каждый пользователь видит **только жалобы своего органа** (фильтрация по `Complaint.assignedTo`). В дашборде:

- таблица с фильтрами (статус/категория/приоритет) и действиями «Взять в работу» / «Назначить» / «Закрыть»;
- карта обращений (react-leaflet + OSM dark) с маркерами, цвет которых зависит от давности;
- кластеризация маркеров на одинаковых координатах;
- переключаемая тепловая карта (leaflet.heat);
- страница «Аналитика и прогнозы» с recharts-графиками и ИИ-прогнозом на завтра.

## Endpoints

Публичные:

- `POST /api/complaints` — создать жалобу `{ text, address?, lat?, lng?, mediaUrls?, source? }`.
- `GET /api/complaints/:id` — получить одну жалобу (для отслеживания по ID).
- `POST /api/telegram` — webhook для Telegram.

Требуют авторизации (cookie `token`):

- `POST /api/auth/login` — `{ username, password }`, ставит httpOnly cookie.
- `POST /api/auth/logout` — удаляет cookie.
- `GET /api/complaints?category=&status=&priority=` — список жалоб (фильтр по органу из роли жёсткий).
- `PATCH /api/complaints/:id` — `{ status, assignedUser? }`, проверка принадлежности органу.
- `GET /api/analytics?months=6` — агрегаты: по категориям/приоритетам, динамика по месяцам, топ-5 районов, среднее время решения.
- `GET /api/predictions` — скользящее среднее за 7 дней + Groq-обоснование.

## Госорганы

`МВД`, `ГАИ`, `Тазалык`, `Бишкекводоканал`, `Бишкектеплосеть`, `Мэрия`.

## Категории

`Энергетика`, `Дороги`, `Мусор`, `Вода`, `Транспорт`, `Связь`, `Безопасность`, `Другое`.
