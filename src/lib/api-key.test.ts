import { afterEach, describe, expect, it } from "vitest";

import { DISCORD_API_KEY_HEADER, hasValidDiscordApiKey, requireDiscordApiKey, safeEqual } from "@/lib/api-key";

const ORIGINAL_KEY = process.env.DISCORD_BOT_API_KEY;

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/check-in-discord/a@b.c", { headers });
}

afterEach(() => {
  process.env.DISCORD_BOT_API_KEY = ORIGINAL_KEY;
});

describe("safeEqual", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for same-length different strings", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
  });

  it("returns false when provided is a prefix of expected", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("returns false when provided is longer than expected", () => {
    expect(safeEqual("abcd", "abc")).toBe(false);
  });

  it("returns false when provided is empty", () => {
    expect(safeEqual("", "abc")).toBe(false);
  });
});

describe("hasValidDiscordApiKey", () => {
  it("accepts the configured key", () => {
    expect(hasValidDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: ORIGINAL_KEY! }))).toBe(true);
  });

  it("rejects a missing or wrong header", () => {
    expect(hasValidDiscordApiKey(req())).toBe(false);
    expect(hasValidDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: "wrong" }))).toBe(false);
  });

  it("fails closed when the env var is unset", () => {
    delete process.env.DISCORD_BOT_API_KEY;
    expect(hasValidDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: "" }))).toBe(false);
    expect(hasValidDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: "undefined" }))).toBe(false);
  });
});

describe("requireDiscordApiKey", () => {
  it("returns a 401 envelope for a bad key", async () => {
    const result = requireDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: "wrong" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({ status: "error", message: "Unauthorized", error: null });
  });

  it("passes with the right key", () => {
    expect(requireDiscordApiKey(req({ [DISCORD_API_KEY_HEADER]: ORIGINAL_KEY! }))).toEqual({ ok: true });
  });
});
