import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export const TOKEN_NAME = "token";

export type Role =
  | "mvd"
  | "gai"
  | "tazalyk"
  | "vodokanal"
  | "teploset"
  | "meria";

export const ROLES: readonly Role[] = [
  "mvd",
  "gai",
  "tazalyk",
  "vodokanal",
  "teploset",
  "meria",
] as const;

// Маппинг роли пользователя → значение поля Complaint.assignedTo
export const ROLE_TO_ORG: Record<Role, string> = {
  mvd: "МВД",
  gai: "ГАИ",
  tazalyk: "Тазалык",
  vodokanal: "Бишкекводоканал",
  teploset: "Бишкектеплосеть",
  meria: "Мэрия",
};

export const ORG_TO_ROLE: Record<string, Role> = Object.fromEntries(
  Object.entries(ROLE_TO_ORG).map(([role, org]) => [org, role as Role])
) as Record<string, Role>;

export interface SessionPayload extends JWTPayload {
  userId: string;
  role: Role;
  username: string;
  displayName: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "JWT_SECRET не задан или слишком короткий. Добавьте в .env.local строку длиной минимум 16 символов."
    );
  }
  return new TextEncoder().encode(secret);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export async function signSession(
  payload: Omit<SessionPayload, keyof JWTPayload>
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!isRole(payload.role) || typeof payload.userId !== "string") {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Читает текущего пользователя в server-компонентах и роутах. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = cookies().get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
