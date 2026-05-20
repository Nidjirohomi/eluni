// /my/* живёт под публичным шеллом (та же шапка, переключатель темы и языка),
// но защищается middleware-ом по роли citizen.
import { PublicShell } from "../(public)/PublicShell";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
