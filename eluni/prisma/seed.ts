import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// telegramUserId можно подставить позже — если задан, при назначении жалобы
// сотруднику автоматически уйдёт уведомление в Telegram (через Bot API).
//
// На каждый госорган — пара аккаунтов:
//   • <org>        — рядовой сотрудник (может «взять в работу» / «закрыть»)
//   • admin_<org>  — начальник органа (дополнительно может назначать жалобы
//                    конкретному дежурному сотруднику)
const USERS = [
  // ─── МВД ────────────────────────────────────────────
  {
    username: "mvd",
    password: "123123",
    role: "mvd",
    displayName: "Сотрудник МВД",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_MVD ?? null,
  },
  {
    username: "admin_mvd",
    password: "123123",
    role: "admin_mvd",
    displayName: "Начальник МВД",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_MVD ?? null,
  },

  // ─── ГАИ ────────────────────────────────────────────
  {
    username: "gai",
    password: "123123",
    role: "gai",
    displayName: "Сотрудник ГАИ",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_GAI ?? null,
  },
  {
    username: "admin_gai",
    password: "123123",
    role: "admin_gai",
    displayName: "Начальник ГАИ",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_GAI ?? null,
  },

  // ─── Тазалык ────────────────────────────────────────
  {
    username: "tazalyk",
    password: "123123",
    role: "tazalyk",
    displayName: "Сотрудник Тазалык",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_TAZALYK ?? null,
  },
  {
    username: "admin_tazalyk",
    password: "123123",
    role: "admin_tazalyk",
    displayName: "Начальник Тазалык",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_TAZALYK ?? null,
  },

  // ─── Бишкекводоканал ────────────────────────────────
  {
    username: "vodokanal",
    password: "123123",
    role: "vodokanal",
    displayName: "Сотрудник Бишкекводоканал",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_VODOKANAL ?? null,
  },
  {
    username: "admin_vodokanal",
    password: "123123",
    role: "admin_vodokanal",
    displayName: "Начальник Бишкекводоканал",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_VODOKANAL ?? null,
  },

  // ─── Бишкектеплосеть ────────────────────────────────
  {
    username: "teploset",
    password: "123123",
    role: "teploset",
    displayName: "Сотрудник Бишкектеплосеть",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_TEPLOSET ?? null,
  },
  {
    username: "admin_teploset",
    password: "123123",
    role: "admin_teploset",
    displayName: "Начальник Бишкектеплосеть",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_TEPLOSET ?? null,
  },

  // ─── Мэрия ──────────────────────────────────────────
  {
    username: "meria",
    password: "123123",
    role: "meria",
    displayName: "Сотрудник Мэрии",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_MERIA ?? null,
  },
  {
    username: "admin_meria",
    password: "123123",
    role: "admin_meria",
    displayName: "Начальник Мэрии",
    status: "on_duty",
    telegramUserId: process.env.SEED_TG_ADMIN_MERIA ?? null,
  },
];

// Тестовые жалобы вокруг центра Бишкека (≈42.87, 74.59).
// Покрывают все 6 органов и все три статуса (pending, in_progress, resolved).
const COMPLAINTS = [
  {
    originalText:
      "На улице Киевской возле дома 95 уже третий день не убирают мусор, контейнеры переполнены, пакеты валяются на тротуаре.",
    officialText:
      "На улице Киевской, в районе дома 95, зафиксировано переполнение мусорных контейнеров и складирование пакетов с отходами на тротуаре в течение трёх суток. Просим организовать вывоз мусора и уборку прилегающей территории.",
    category: "Мусор",
    priority: "Средний",
    assignedTo: "Тазалык",
    assignedUser: "Сотрудник Тазалык",
    status: "in_progress",
    address: "ул. Киевская, 95, Бишкек",
    lat: 42.8765,
    lng: 74.6012,
    source: "web",
  },
  {
    originalText:
      "На пересечении Чуй и Манаса огромная яма, машины уже два колеса там пробили, срочно нужен ремонт!",
    officialText:
      "На перекрёстке проспекта Чуй и улицы Манаса обнаружено значительное разрушение дорожного полотна, представляющее угрозу для транспортных средств. Просим в кратчайшие сроки организовать ремонт участка.",
    category: "Дороги",
    priority: "Высокий",
    assignedTo: "Мэрия",
    assignedUser: null,
    status: "pending",
    address: "пр. Чуй / ул. Манаса, Бишкек",
    lat: 42.8742,
    lng: 74.5895,
    source: "web",
  },
  {
    originalText:
      "В нашем доме на Ахунбаева 134 уже сутки нет холодной воды, никто ничего не объясняет.",
    officialText:
      "По адресу улица Ахунбаева, 134 зафиксировано отсутствие холодного водоснабжения в течение суток. Просим выяснить причину и восстановить подачу воды.",
    category: "Вода",
    priority: "Высокий",
    assignedTo: "Бишкекводоканал",
    assignedUser: "Сотрудник Бишкекводоканал",
    status: "resolved",
    address: "ул. Ахунбаева, 134, Бишкек",
    lat: 42.8521,
    lng: 74.6201,
    source: "telegram",
  },
  {
    originalText:
      "Возле школы №12 на Боконбаева вечером собирается компания, шумят, бьют бутылки, страшно мимо ходить.",
    officialText:
      "В вечернее время в районе школы №12 на улице Боконбаева наблюдается скопление лиц, нарушающих общественный порядок (шум, бой стеклянной тары). Просим направить наряд для проверки и принятия мер.",
    category: "Безопасность",
    priority: "Средний",
    assignedTo: "МВД",
    assignedUser: null,
    status: "pending",
    address: "ул. Боконбаева, школа №12, Бишкек",
    lat: 42.8689,
    lng: 74.5961,
    source: "web",
  },
  {
    originalText:
      "В микрорайоне Джал-23 в подъезде батареи холодные четвёртый день, дома +14, дети мёрзнут.",
    officialText:
      "В микрорайоне Джал-23 зафиксировано отсутствие отопления в подъезде в течение четырёх суток, температура в квартирах не превышает +14°C. Просим в экстренном порядке восстановить теплоснабжение.",
    category: "Энергетика",
    priority: "Высокий",
    assignedTo: "Бишкектеплосеть",
    assignedUser: "Сотрудник Бишкектеплосеть",
    status: "in_progress",
    address: "мкр. Джал-23, Бишкек",
    lat: 42.8312,
    lng: 74.5732,
    source: "telegram",
  },
  {
    originalText:
      "На Ибраимова возле ЦУМа постоянно паркуются прямо на тротуаре, пешеходам приходится обходить по проезжей части.",
    officialText:
      "На улице Ибраимова, в районе ЦУМа, зафиксированы систематические нарушения правил парковки — транспортные средства размещаются на тротуаре, вынуждая пешеходов выходить на проезжую часть. Просим организовать рейд и принять меры.",
    category: "Транспорт",
    priority: "Низкий",
    assignedTo: "ГАИ",
    assignedUser: null,
    status: "pending",
    address: "ул. Ибраимова, ЦУМ, Бишкек",
    lat: 42.8772,
    lng: 74.6045,
    source: "web",
  },
];

async function main() {
  console.log("🧹 Очистка таблиц Complaint и User...");
  await prisma.complaint.deleteMany();
  await prisma.user.deleteMany();

  console.log("🌱 Засев пользователей...");
  for (const u of USERS) {
    await prisma.user.create({ data: u });
    console.log(`  ✓ ${u.username} (${u.displayName})`);
  }

  console.log("🌱 Засев тестовых жалоб...");
  for (const c of COMPLAINTS) {
    await prisma.complaint.create({ data: c });
    console.log(`  ✓ [${c.assignedTo}] ${c.category} — ${c.status}`);
  }

  console.log(
    `✅ Готово: ${USERS.length} пользователей, ${COMPLAINTS.length} жалоб.`
  );
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
