import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_TO_ORG } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardClient, type ComplaintRow } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const org = ROLE_TO_ORG[user.role];

  const raw = (await prisma.complaint.findMany({
    where: { assignedTo: org },
    orderBy: { createdAt: "desc" },
  })) as Array<{
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
    createdAt: Date;
    updatedAt: Date;
  }>;

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

  return (
    <DashboardClient
      org={org}
      role={user.role}
      username={user.username}
      initialComplaints={complaints}
    />
  );
}
