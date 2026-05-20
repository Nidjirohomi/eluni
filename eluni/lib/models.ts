/**
 * Серверные тип-shim для моделей User/Complaint.
 * Используются вместо сгенерированных Prisma-типов в API-роутах,
 * чтобы избежать TS-ошибок до выполнения `prisma generate` после
 * обновления schema.prisma (добавление status, telegramUserId и т.п.).
 *
 * На рантайме Prisma Client уже умеет работать с этими полями.
 */
import { prisma } from "@/lib/db";

export interface UserModel {
  id: string;
  username: string;
  password: string;
  role: string;
  displayName: string;
  status: string;
  telegramUserId: string | null;
  bindToken: string | null;
  createdAt: Date;
}

export interface ComplaintModel {
  id: string;
  originalText: string;
  officialText: string;
  category: string;
  priority: string;
  assignedTo: string;
  assignedUser: string | null;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  mediaUrls: string | null;
  source: string;
  telegramUserId: string | null;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AnyDelegate {
  findUnique: (args: unknown) => Promise<unknown>;
  findFirst: (args?: unknown) => Promise<unknown>;
  findMany: (args?: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
  deleteMany: (args?: unknown) => Promise<unknown>;
  count: (args?: unknown) => Promise<number>;
}

// Доступ к prisma с «мягкими» типами — для совместимости с расширенной схемой.
export const db = prisma as unknown as {
  user: AnyDelegate;
  complaint: AnyDelegate;
};
