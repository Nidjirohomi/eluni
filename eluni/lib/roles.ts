// Чистые хелперы и константы ролей — БЕЗ зависимостей от next/headers,
// чтобы их можно было импортировать как из server-, так и из client-компонентов.

// Сотрудник: видит жалобы своего органа, может «взять в работу» / «закрыть».
// Начальник (admin_*): видит жалобы своего органа + может назначать жалобы
// конкретному сотруднику органа, состоящему на дежурстве.
export type Role =
  | "mvd"
  | "gai"
  | "tazalyk"
  | "vodokanal"
  | "teploset"
  | "meria"
  | "admin_mvd"
  | "admin_gai"
  | "admin_tazalyk"
  | "admin_vodokanal"
  | "admin_teploset"
  | "admin_meria";

export const ROLES: readonly Role[] = [
  "mvd",
  "gai",
  "tazalyk",
  "vodokanal",
  "teploset",
  "meria",
  "admin_mvd",
  "admin_gai",
  "admin_tazalyk",
  "admin_vodokanal",
  "admin_teploset",
  "admin_meria",
] as const;

// Маппинг роли пользователя → значение поля Complaint.assignedTo (госорган).
// Начальник органа видит/управляет жалобами того же органа, что и его сотрудники.
export const ROLE_TO_ORG: Record<Role, string> = {
  mvd: "МВД",
  gai: "ГАИ",
  tazalyk: "Тазалык",
  vodokanal: "Бишкекводоканал",
  teploset: "Бишкектеплосеть",
  meria: "Мэрия",
  admin_mvd: "МВД",
  admin_gai: "ГАИ",
  admin_tazalyk: "Тазалык",
  admin_vodokanal: "Бишкекводоканал",
  admin_teploset: "Бишкектеплосеть",
  admin_meria: "Мэрия",
};

// «Начальник» — у роли префикс admin_.
export function isManager(role: Role): boolean {
  return role.startsWith("admin_");
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
