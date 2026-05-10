import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElUni — приём городских жалоб",
  description:
    "Платформа для приёма обращений граждан с AI-классификацией и маршрутизацией в государственные органы Кыргызстана.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-[#0a0a0a] text-white">{children}</body>
    </html>
  );
}
