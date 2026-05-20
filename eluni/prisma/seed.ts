// Полная сидовая база: 6 органов × (2 начальника + 8 сотрудников) = 60 ролевых
// аккаунтов, 1 супер-админ, 5 тестовых граждан и 18 разных жалоб на орган
// (всего ≈108) — с разными статусами, приоритетами и привязкой к гражданам.
//
// Координаты подбираются случайно в пределах Бишкека.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Справочники ─────────────────────────────────────────────────────────

interface OrgDef {
  key: string;          // префикс username (mvd, gai, …)
  name: string;         // отображаемое имя органа (assignedTo в Complaint)
  role: string;         // роль обычного сотрудника
  adminRole: string;    // роль начальника
  category: string;     // основная категория, относящаяся к органу
}

const ORGS: OrgDef[] = [
  { key: "mvd",       name: "МВД",              role: "mvd",       adminRole: "admin_mvd",       category: "Безопасность" },
  { key: "gai",       name: "ГАИ",              role: "gai",       adminRole: "admin_gai",       category: "Транспорт" },
  { key: "tazalyk",   name: "Тазалык",          role: "tazalyk",   adminRole: "admin_tazalyk",   category: "Мусор" },
  { key: "vodokanal", name: "Бишкекводоканал", role: "vodokanal", adminRole: "admin_vodokanal", category: "Вода" },
  { key: "teploset",  name: "Бишкектеплосеть", role: "teploset",  adminRole: "admin_teploset",  category: "Энергетика" },
  { key: "meria",     name: "Мэрия",            role: "meria",     adminRole: "admin_meria",     category: "Дороги" },
];

// Шаблоны жалоб для каждой категории. На каждом проходе seed-а адрес и точка
// подменяются случайным образом, поэтому одинаковые шаблоны дают разнообразные
// записи в БД.
const TEMPLATES: Record<string, Array<{ original: string; official: string }>> = {
  Безопасность: [
    {
      original:
        "Возле школы №{n} вечером собирается компания, шумят, бьют бутылки, страшно мимо ходить.",
      official:
        "В вечернее время в районе школы №{n} наблюдается скопление лиц, нарушающих общественный порядок (шум, бой стеклянной тары). Просим направить наряд для проверки.",
    },
    {
      original:
        "В подъезде на {addr} ночуют посторонние, дверь не закрывается, жители боятся.",
      official:
        "В подъезде по адресу {addr} зафиксировано нахождение посторонних лиц в ночное время, входная дверь не запирается. Просим принять меры.",
    },
    {
      original:
        "На {addr} у магазина третий день дерутся подвыпившие граждане, никто не реагирует.",
      official:
        "По адресу {addr} в районе торговой точки зафиксированы регулярные конфликты с участием лиц в состоянии алкогольного опьянения. Просим направить участкового.",
    },
    {
      original:
        "Возле остановки на {addr} опять кто-то разбил окна и оставил мусор, ходить страшно.",
      official:
        "По адресу {addr} зафиксирован акт вандализма в районе остановки общественного транспорта. Просим провести проверку и принять меры.",
    },
  ],
  Транспорт: [
    {
      original:
        "На {addr} постоянно паркуются прямо на тротуаре, пешеходам приходится обходить по проезжей части.",
      official:
        "По адресу {addr} зафиксированы систематические нарушения правил парковки — транспортные средства размещаются на тротуаре. Просим организовать рейд.",
    },
    {
      original:
        "Светофор на перекрёстке {addr} не работает уже неделю, постоянно создаются аварийные ситуации.",
      official:
        "По адресу {addr} нерабочее состояние светофорного объекта в течение недели создаёт угрозу безопасности дорожного движения. Просим срочно устранить неисправность.",
    },
    {
      original:
        "На {addr} снова таксисты бросают машины во второй ряд, движение встаёт намертво.",
      official:
        "По адресу {addr} зафиксирована несанкционированная стоянка такси во втором ряду, нарушающая дорожное движение. Просим направить экипаж ДПС.",
    },
    {
      original:
        "На {addr} разметка стерлась полностью, водители не понимают, где их полоса.",
      official:
        "По адресу {addr} наблюдается значительный износ дорожной разметки, что затрудняет ориентирование водителей. Просим обновить разметку.",
    },
  ],
  Мусор: [
    {
      original:
        "На {addr} уже третий день не убирают мусор, контейнеры переполнены, пакеты валяются на тротуаре.",
      official:
        "По адресу {addr} зафиксировано переполнение мусорных контейнеров и складирование пакетов с отходами на тротуаре. Просим организовать вывоз мусора.",
    },
    {
      original:
        "Возле дома {n} на {addr} организовали стихийную свалку, запах ужасный.",
      official:
        "В районе дома {n} по адресу {addr} образовалось несанкционированное складирование отходов, ухудшающее санитарное состояние территории. Просим ликвидировать свалку.",
    },
    {
      original:
        "Контейнеры на {addr} стоят без крышек, бродячие собаки раскидывают мусор по всей округе.",
      official:
        "По адресу {addr} зафиксировано отсутствие крышек на мусорных контейнерах, что приводит к разносу отходов. Просим заменить или отремонтировать контейнерное оборудование.",
    },
    {
      original:
        "После ремонта на {addr} строители оставили кучу мусора, никто её не вывозит.",
      official:
        "По адресу {addr} после проведения строительных работ зафиксированы несанкционированные отвалы строительного мусора. Просим организовать вывоз.",
    },
  ],
  Вода: [
    {
      original:
        "В нашем доме на {addr} уже сутки нет холодной воды, никто ничего не объясняет.",
      official:
        "По адресу {addr} зафиксировано отсутствие холодного водоснабжения в течение суток. Просим выяснить причину и восстановить подачу воды.",
    },
    {
      original:
        "На {addr} прорвало трубу, вода льётся фонтаном прямо на дорогу.",
      official:
        "По адресу {addr} обнаружен порыв магистрального водопровода с активным истечением воды на проезжую часть. Просим устранить аварию.",
    },
    {
      original:
        "Из-под крана на {addr} течёт ржавая вода, пить и готовить невозможно.",
      official:
        "По адресу {addr} зафиксировано ухудшение качества питьевой воды (ржавый цвет). Просим провести проверку и устранить причину.",
    },
    {
      original:
        "Канализация на {addr} опять забилась, стоки выливаются во двор.",
      official:
        "По адресу {addr} обнаружено засорение канализационной системы с выходом стоков во двор. Просим в срочном порядке провести прочистку.",
    },
  ],
  Энергетика: [
    {
      original:
        "В микрорайоне {addr} в подъезде батареи холодные четвёртый день, дома +14, дети мёрзнут.",
      official:
        "По адресу {addr} зафиксировано отсутствие отопления в течение четырёх суток, температура в квартирах не превышает +14°C. Просим в экстренном порядке восстановить теплоснабжение.",
    },
    {
      original:
        "Свет на {addr} мигает несколько раз в день, техника уже выходит из строя.",
      official:
        "По адресу {addr} зафиксированы регулярные перепады напряжения, приводящие к выходу бытовой техники из строя. Просим провести проверку питающей линии.",
    },
    {
      original:
        "На {addr} опять прорвало трубу теплосети, пар идёт прямо из земли.",
      official:
        "По адресу {addr} зафиксирован порыв теплотрассы с интенсивным выходом пара на поверхность. Просим устранить аварию.",
    },
    {
      original:
        "Уличное освещение на {addr} не работает уже две недели, вечером ходить опасно.",
      official:
        "По адресу {addr} наблюдается отсутствие уличного освещения более двух недель, что создаёт угрозу безопасности пешеходов. Просим восстановить работу фонарей.",
    },
  ],
  Дороги: [
    {
      original:
        "На {addr} огромная яма, машины уже несколько колёс там пробили, срочно нужен ремонт.",
      official:
        "По адресу {addr} обнаружено значительное разрушение дорожного полотна, представляющее угрозу для транспортных средств. Просим в кратчайшие сроки организовать ремонт участка.",
    },
    {
      original:
        "Тротуар на {addr} весь в трещинах, с коляской не пройти, мамы жалуются.",
      official:
        "По адресу {addr} зафиксировано аварийное состояние пешеходного тротуара. Просим организовать ремонтные работы.",
    },
    {
      original:
        "Деревья на {addr} давно не подрезали, ветки нависают над проводами.",
      official:
        "По адресу {addr} требуется санитарная обрезка зелёных насаждений, нависающих над линиями электропередачи. Просим включить участок в график работ.",
    },
    {
      original:
        "Детская площадка на {addr} в ужасном состоянии, качели сломаны, песочница пустая.",
      official:
        "По адресу {addr} зафиксировано неудовлетворительное состояние объектов детской игровой площадки. Просим провести ремонт.",
    },
  ],
};

// Заготовка адресов Бишкека для подстановки в шаблоны.
const STREETS = [
  "ул. Киевская",
  "ул. Чуй",
  "ул. Манаса",
  "ул. Ахунбаева",
  "ул. Боконбаева",
  "ул. Ибраимова",
  "ул. Логвиненко",
  "ул. Гоголя",
  "ул. Токтогула",
  "ул. Раззакова",
  "ул. Юнусалиева",
  "ул. Жибек-Жолу",
  "ул. Айтматова",
  "ул. Байтик-Баатыра",
  "ул. Тыныстанова",
  "ул. Фрунзе",
  "ул. Московская",
  "пр. Манаса",
  "ул. Турусбекова",
  "ул. Орозбекова",
];
const DISTRICTS = [
  "мкр. Джал-23",
  "мкр. Джал-29",
  "мкр. Аламедин-1",
  "мкр. Восток-5",
  "мкр. Асанбай",
  "ж/м Ак-Орго",
  "7 мкр.",
  "10 мкр.",
];

// ─── Утилиты ─────────────────────────────────────────────────────────────

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Случайные координаты в пределах Бишкека.
function randomBishkekPoint(): { lat: number; lng: number } {
  const lat = 42.79 + Math.random() * (42.92 - 42.79);
  const lng = 74.5 + Math.random() * (74.7 - 74.5);
  return { lat: Number(lat.toFixed(5)), lng: Number(lng.toFixed(5)) };
}

function randomAddress(): string {
  const street = pick(STREETS);
  const district = Math.random() < 0.3 ? `, ${pick(DISTRICTS)}` : "";
  const house = Math.floor(1 + Math.random() * 220);
  return `${street}, ${house}${district}, Бишкек`;
}

function fill(template: string, addr: string): string {
  const n = String(Math.floor(1 + Math.random() * 30));
  return template.replaceAll("{addr}", addr).replaceAll("{n}", n);
}

// Циклические распределения, чтобы выборка статусов / приоритетов / источников
// получалась воспроизводимой и сбалансированной.
const PRIORITY_CYCLE = ["Высокий", "Средний", "Средний", "Средний", "Низкий", "Низкий"];
const STATUS_CYCLE = [
  "pending",
  "pending",
  "pending",
  "in_progress",
  "in_progress",
  "in_progress",
  "resolved",
  "resolved",
];

// ─── Генерация пользователей ─────────────────────────────────────────────

interface SeedUser {
  username: string;
  password: string;
  role: string;
  displayName: string;
  status: string;
  telegramUserId: string | null;
  bindToken: string | null;
}

// 6-символьный токен из заглавных латинских букв и цифр без неоднозначных 0/O/1/I.
const BIND_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const usedBindTokens = new Set<string>();

function generateBindToken(length = 6): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let s = "";
    for (let i = 0; i < length; i++) {
      s += BIND_ALPHABET[Math.floor(Math.random() * BIND_ALPHABET.length)];
    }
    if (!usedBindTokens.has(s)) {
      usedBindTokens.add(s);
      return s;
    }
  }
  // Маловероятный фолбэк: коллизий слишком много — добавим суффикс.
  const fallback = `${Date.now().toString(36).toUpperCase().slice(-length)}`;
  usedBindTokens.add(fallback);
  return fallback;
}

function buildUsers(): SeedUser[] {
  const users: SeedUser[] = [];

  // Супер-админ — без органа.
  users.push({
    username: "superadmin",
    password: "123123",
    role: "superadmin",
    displayName: "Супер-администратор",
    status: "off_duty",
    telegramUserId: null,
    bindToken: generateBindToken(),
  });

  for (const org of ORGS) {
    // 2 начальника
    users.push({
      username: `admin_${org.key}`,
      password: "123123",
      role: org.adminRole,
      displayName: `Начальник ${org.name}`,
      status: "on_duty",
      telegramUserId: null,
      bindToken: generateBindToken(),
    });
    users.push({
      username: `admin2_${org.key}`,
      password: "123123",
      role: org.adminRole,
      displayName: `Зам. начальника ${org.name}`,
      status: "on_duty",
      telegramUserId: null,
      bindToken: generateBindToken(),
    });

    // 8 рядовых сотрудников: <key> и <key>2..<key>8
    for (let i = 1; i <= 8; i++) {
      const username = i === 1 ? org.key : `${org.key}${i}`;
      users.push({
        username,
        password: "123123",
        role: org.role,
        displayName: `Сотрудник ${org.name} #${i}`,
        // Половина — на смене, половина — нет, чтобы тестировать назначение.
        status: i % 2 === 1 ? "on_duty" : "off_duty",
        telegramUserId: null,
        bindToken: generateBindToken(),
      });
    }
  }

  // Базовый «гражданин» — за этим аккаунтом стоит кнопка
  // «Войти через Түндүк» в публичной форме (заглушка верификации).
  // Граждане не пользуются /bind — bindToken им не нужен.
  users.push({
    username: "citizen",
    password: "123123",
    role: "citizen",
    displayName: "Тестовый гражданин",
    status: "off_duty",
    telegramUserId: process.env.SEED_TG_CITIZEN ?? null,
    bindToken: null,
  });

  // Дополнительные тестовые граждане для разнообразия выборки.
  for (let i = 1; i <= 5; i++) {
    users.push({
      username: `citizen${i}`,
      password: "123123",
      role: "citizen",
      displayName: `Гражданин #${i}`,
      status: "off_duty",
      telegramUserId: i === 1 ? process.env.SEED_TG_CITIZEN1 ?? null : null,
      bindToken: null,
    });
  }

  return users;
}

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  console.log("🧹 Очистка таблиц Complaint и User...");
  await prisma.complaint.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Засев пользователей...");
  const users = buildUsers();
  for (const u of users) {
    await prisma.user.create({ data: u });
  }
  console.log(`  ✓ ${users.length} пользователей создано`);

  // Сразу подберём id для citizen-ов и сотрудников по ролям.
  const created = await prisma.user.findMany();
  const citizenIds = created
    .filter((u) => u.role === "citizen")
    .map((u) => u.id);
  const employeesByRole = new Map<string, typeof created>();
  for (const u of created) {
    const list = employeesByRole.get(u.role) ?? [];
    list.push(u);
    employeesByRole.set(u.role, list);
  }

  console.log("🌱 Засев тестовых жалоб...");
  let total = 0;
  for (const org of ORGS) {
    const templates = TEMPLATES[org.category];
    const employees = employeesByRole.get(org.role) ?? [];

    // 18 жалоб на орган.
    for (let i = 0; i < 18; i++) {
      const tpl = templates[i % templates.length];
      const addr = randomAddress();
      const original = fill(tpl.original, addr);
      const official = fill(tpl.official, addr);
      const { lat, lng } = randomBishkekPoint();

      const priority = PRIORITY_CYCLE[(i * 2 + 1) % PRIORITY_CYCLE.length];
      const status = STATUS_CYCLE[i % STATUS_CYCLE.length];

      // Источник и привязка к гражданину.
      // Доли: 50% — web (всегда привязка), 30% — telegram c userId,
      //       20% — telegram анонимно (без userId).
      const r = Math.random();
      let source: string;
      let userId: string | null;
      let telegramUserId: string | null = null;

      if (r < 0.5) {
        source = "web";
        userId = citizenIds.length > 0 ? pick(citizenIds) : null;
      } else if (r < 0.8) {
        source = "telegram";
        userId = citizenIds.length > 0 ? pick(citizenIds) : null;
        telegramUserId = `tg_seed_${Math.floor(Math.random() * 1_000_000)}`;
      } else {
        source = "telegram";
        userId = null;
        telegramUserId = `tg_seed_${Math.floor(Math.random() * 1_000_000)}`;
      }

      // Назначение исполнителя в зависимости от статуса.
      let assignedUser: string | null = null;
      if (status === "in_progress" || status === "resolved") {
        if (employees.length > 0) {
          assignedUser = pick(employees).displayName;
        }
      }

      // userId в типах появится только после `prisma generate` — каст в any
      // позволяет seed-у компилироваться сразу после редактирования схемы.
      await (prisma.complaint as unknown as {
        create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
      }).create({
        data: {
          originalText: original,
          officialText: official,
          category: org.category,
          priority,
          assignedTo: org.name,
          assignedUser,
          status,
          address: addr,
          lat,
          lng,
          source,
          telegramUserId,
          userId,
        },
      });
      total++;
    }
    console.log(`  ✓ ${org.name}: 18 жалоб`);
  }

  console.log(`✅ Готово: ${users.length} пользователей, ${total} жалоб.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

