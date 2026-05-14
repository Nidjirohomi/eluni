import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_TO_ORG } from "@/lib/auth";
import { db, type ComplaintModel, type UserModel } from "@/lib/models";
import { DashboardClient } from "./DashboardClient";
import type { ComplaintRow } from "./types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const org = ROLE_TO_ORG[user.role];

  const [raw, me] = await Promise.all([
    db.complaint.findMany({
      where: { assignedTo: org },
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
