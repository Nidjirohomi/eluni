import { redirect } from "next/navigation";
import {
  getCurrentUser,
  ROLE_TO_ORG,
  isSuperadmin,
  isCitizen,
} from "@/lib/auth";
import { db, type ComplaintModel, type UserModel } from "@/lib/models";
import { parseMediaUrls } from "@/lib/media";
import { DashboardClient } from "./DashboardClient";
import type { ComplaintRow } from "./types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Гражданина в дашборд пускать нельзя — middleware и так редиректит,
  // но подстрахуемся на случай прямого захода.
  if (isCitizen(user.role)) redirect("/my/complaints");

  // Супер-админ не привязан к органу — он видит ВСЕ жалобы.
  const superadmin = isSuperadmin(user.role);
  const org = superadmin ? "" : ROLE_TO_ORG[user.role];

  const [raw, me] = await Promise.all([
    db.complaint.findMany({
      where: superadmin ? {} : { assignedTo: org },
      orderBy: { createdAt: "desc" },
    }) as Promise<ComplaintModel[]>,
    db.user.findUnique({
      where: { id: user.userId },
    }) as Promise<UserModel | null>,
  ]);

  const complaints: ComplaintRow[] = raw.map((c) => ({
    id: c.id,
    originalText: c.originalText,
    officialText: c.officialText,
    category: c.category,
    priority: c.priority,
    assignedTo: c.assignedTo,
    assignedUser: c.assignedUser,
    status: c.status,
    address: c.address,
    lat: c.lat,
    lng: c.lng,
    source: c.source,
    userId: (c as ComplaintModel & { userId?: string | null }).userId ?? null,
    mediaUrls: parseMediaUrls(c.mediaUrls),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const initialDuty: "on_duty" | "off_duty" =
    me?.status === "on_duty" ? "on_duty" : "off_duty";

  return (
    <DashboardClient
      org={org}
      role={user.role}
      username={user.username}
      displayName={user.displayName}
      initialComplaints={complaints}
      initialDuty={initialDuty}
    />
  );
}
