import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = [
  { username: "mvd", password: "123123", role: "mvd", displayName: "Сотрудник МВД" },
  { username: "gai", password: "123123", role: "gai", displayName: "Сотрудник ГАИ" },
  { username: "tazalyk", password: "123123", role: "tazalyk", displayName: "Сотрудник Тазалык" },
  { username: "vodokanal", password: "123123", role: "vodokanal", displayName: "Сотрудник Бишкекводоканал" },
  { username: "teploset", password: "123123", role: "teploset", displayName: "Сотрудник Бишкектеплосеть" },
  { username: "meria", password: "123123", role: "meria", displayName: "Сотрудник Мэрии" },
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
