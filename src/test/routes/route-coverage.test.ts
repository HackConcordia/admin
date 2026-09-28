import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PUBLIC_API_PATHS } from "@/middleware/api-auth";
import { findHandlerExports, findUnguardedHandlers } from "@/test/route-guard-scan";

const API_ROOT = fileURLToPath(new URL("../../app/api", import.meta.url));

function listRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listRouteFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

/**
 * PUBLIC_API_PATHS (from the middleware, the single source of truth) is expressed as request
 * URL paths, e.g. "/api/auth-token/login". Route files live under src/app/api/(group)/... with
 * their own Next.js segment syntax ([email], (group)), so this maps a route file's relative
 * path to the URL path the middleware would see for it, in order to reuse that list here.
 */
function toUrlPath(rel: string): string {
  return `/api/${rel.replace(/^\(group\)\//, "").replace(/\/route\.ts$/, "")}`;
}

const routeFiles = listRouteFiles(API_ROOT).map((full) => {
  const rel = path.relative(API_ROOT, full).split(path.sep).join("/");
  return { full, rel, urlPath: toUrlPath(rel) };
});

const PUBLIC_ROUTES = new Set(routeFiles.filter(({ urlPath }) => PUBLIC_API_PATHS.has(urlPath)).map(({ rel }) => rel));

describe("API route guard coverage", () => {
  it("scans all 40 route files", () => {
    expect(routeFiles).toHaveLength(40);
  });

  it("finds the public allowlist among the scanned routes", () => {
    expect(PUBLIC_ROUTES.size).toBe(PUBLIC_API_PATHS.size);
  });

  it.each(routeFiles)("$rel guards every exported handler", ({ full, rel }) => {
    const source = readFileSync(full, "utf8");
    expect(findHandlerExports(source).length).toBeGreaterThan(0);

    if (PUBLIC_ROUTES.has(rel)) return;

    expect(findUnguardedHandlers(source)).toEqual([]);
  });
});
