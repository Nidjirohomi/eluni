import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

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
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen bg-app text-app">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
