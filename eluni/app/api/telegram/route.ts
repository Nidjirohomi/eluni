import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBot } from "@/lib/telegramBot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook endpoint для production-режима (https://your-domain/api/telegram).
// Для локальной разработки используйте `npm run bot` (long-polling).
let handler: ((req: Request) => Promise<Response>) | null = null;

function getHandler() {
  if (handler) return handler;
  const bot = getBot();
  handler = webhookCallback(bot, "std/http");
  return handler;
}

export async function POST(req: NextRequest) {
  try {
    const h = getHandler();
    return await h(req);
  } catch (err) {
    console.error("[POST /api/telegram] webhook error:", err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Используйте POST для приёма Telegram webhook. Локально запускайте бота через `npm run bot`.",
  });
}
