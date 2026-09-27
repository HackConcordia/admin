import { NextResponse } from "next/server";

export const DISCORD_API_KEY_HEADER = "x-api-key";

/** Constant-time comparison for equal-length strings. Runs on the edge runtime (no node:crypto). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return difference === 0;
}

export function hasValidDiscordApiKey(req: Request): boolean {
  const expected = process.env.DISCORD_BOT_API_KEY;
  if (!expected) return false;

  const provided = req.headers.get(DISCORD_API_KEY_HEADER);
  if (!provided) return false;

  return safeEqual(provided, expected);
}

export function requireDiscordApiKey(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  if (hasValidDiscordApiKey(req)) {
    return { ok: true };
  }
  return {
    ok: false,
    response: NextResponse.json({ status: "error", message: "Unauthorized", error: null }, { status: 401 }),
  };
}
