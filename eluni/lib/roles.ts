// Чистые хелперы и константы ролей — БЕЗ зависимостей от next/headers,
// чтобы их можно было импортировать как из server-, так и из client-компонентов.

// Сотрудник: видит жалобы своего органа, может «взять в работу» / «закрыть».
// Начальник (admin_*): видит жалобы своего органа + может назначать жалобы
// конкретному сотруднику органа, состоящему на дежурстве.
// Супер-админ: видит ВСЕ жалобы всех органов, аналитика по всем,
//              но не имеет права менять статус, назначать или брать в работу.
// Гражданин: верифицированный пользователь (через Түндүк), может подавать
//            жалобы через сайт и видеть только свои.
export type Role =
  | "citizen"
  | "superadmin"
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
  "citizen",
  "superadmin",
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

/**
 * Маппинг роли пользователя → значение поля Complaint.assignedTo (госорган).
 * Начальник органа видит/управляет жалобами того же органа, что и его сотрудники.
 *
 * Спец-значения:
 *   - citizen     → "" (гражданин не привязан к органу)
 *   - superadmin  → "*" (видит все органы)
 */
export const ROLE_TO_ORG: Record<Role, string> = {
  citizen: "",
  superadmin: "*",
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

/** Список всех «реальных» органов (без citizen / superadmin). */
export const ALL_ORGS: readonly string[] = [
  "МВД",
  "ГАИ",
  "Тазалык",
  "Бишкекводоканал",
  "Бишкектеплосеть",
  "Мэрия",
] as const;

/** Начальник органа — может назначать жалобы сотрудникам. */
export function isManager(role: Role): boolean {
  return role.startsWith("admin_");
}

export function isSuperadmin(role: Role): boolean {
  return role === "superadmin";
}

export function isCitizen(role: Role): boolean {
  return role === "citizen";
}

/** Любой госслужащий (рядовой / начальник / супер-админ). */
export function isStaff(role: Role): boolean {
  return role !== "citizen";
}

/**
 * Может ли роль выполнять рабочие действия по жалобам
 * (взять в работу, закрыть, назначить). Супер-админ — нет.
 */
export function canActOnComplaints(role: Role): boolean {
  return role !== "citizen" && role !== "superadmin";
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
