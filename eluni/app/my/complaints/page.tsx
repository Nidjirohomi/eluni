// Список жалоб гражданина с возможностью редактировать pending и отзывать.
// Защищён middleware-ом и по сути доступен только пользователю с ролью citizen.
import { headers } from "next/headers";
import { getCurrentUser, isCitizen } from "@/lib/auth";
import { CitizenLoginGate } from "../../(public)/CitizenLoginGate";
import { MyComplaintsClient } from "./MyComplaintsClient";

export default async function MyComplaintsPage() {
  // headers() — гарантия динамического рендера (cookie-сессия каждый запрос).
  headers();
  const me = await getCurrentUser();

  if (!me) return <CitizenLoginGate variant="anonymous" />;
  if (!isCitizen(me.role)) return <CitizenLoginGate variant="staff" />;

  return <MyComplaintsClient displayName={me.displayName} />;
}
