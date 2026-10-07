/**
 * src/emails/ is a generated copy of the registration app's email kit
 * (registration-website-conuhacks-10/my-app/emails, copied by its `npm run emails:sync`).
 * This test recomputes the hash the sync script wrote to .kit-hash (same algorithm as
 * my-app/scripts/sync-emails.mjs) and fails when any copied file was edited, added or removed by hand.
 * This file itself is admin-owned: the sync keeps it and leaves it out of the hash.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const KIT_DIR = __dirname;
const HASH_FILE = ".kit-hash";
const NOT_HASHED = new Set([HASH_FILE, "kit-sync.test.ts"]);

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return dir === KIT_DIR && NOT_HASHED.has(entry.name) ? [] : [full];
  });
}

function kitHash(): string {
  const files = listFiles(KIT_DIR)
    .map((full) => ({
      path: relative(KIT_DIR, full).split(sep).join("/"),
      content: readFileSync(full, "utf8").replace(/\r\n/g, "\n"),
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const hash = createHash("sha256");
  for (const { path, content } of files) hash.update(`${path}\0${content}\0`, "utf8");
  return hash.digest("hex");
}

describe("email kit copy (src/emails)", () => {
  it("matches the hash written by the registration repo's emails:sync", () => {
    const expected = readFileSync(join(KIT_DIR, HASH_FILE), "utf8").trim();
    expect(
      kitHash(),
      "src/emails was edited by hand. Edit registration-website-conuhacks-10/my-app/emails instead, then run `npm run emails:sync` there.",
    ).toBe(expected);
  });
});
