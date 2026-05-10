import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AnalyticsClient } from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AnalyticsClient />;
}
