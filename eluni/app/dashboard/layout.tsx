import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Дашборд занимает весь экран — layout минимальный.
  return <div className="h-screen w-screen overflow-hidden bg-app text-app">{children}</div>;
}
