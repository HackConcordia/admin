import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { API_KEY_PATH_PREFIXES, PUBLIC_API_PATHS } from "@/middleware/api-auth";

const API_ROOT = fileURLToPath(new URL("../../app/api", import.meta.url));

const HANDLER_EXPORT = /export\s+(?:const|async\s+function|function)\s+(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;

function listRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return listRouteFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

/**
 * PUBLIC_API_PATHS / API_KEY_PATH_PREFIXES (from the middleware, the single source of truth)
 * are expressed as request URL paths, e.g. "/api/auth-token/login", "/api/check-in-discord/".
 * Route files live under src/app/api/(group)/... with their own Next.js segment syntax
 * ([email], (group)), so this maps a route file's relative path to the URL path the
 * middleware would see for it, in order to reuse those two lists here.
 */
function toUrlPath(rel: string): string {
  return `/api/${rel.replace(/^\(group\)\//, "").replace(/\/route\.ts$/, "")}`;
}

const routeFiles = listRouteFiles(API_ROOT).map((full) => {
  const rel = path.relative(API_ROOT, full).split(path.sep).join("/");
  return { full, rel, urlPath: toUrlPath(rel) };
});

const PUBLIC_ROUTES = new Set(routeFiles.filter(({ urlPath }) => PUBLIC_API_PATHS.has(urlPath)).map(({ rel }) => rel));

const API_KEY_ROUTES = new Set(
  routeFiles
    .filter(({ urlPath }) => API_KEY_PATH_PREFIXES.some((prefix) => urlPath.startsWith(prefix)))
    .map(({ rel }) => rel),
);

describe("API route guard coverage", () => {
  it("scans all 41 route files", () => {
    expect(routeFiles).toHaveLength(41);
  });

  it("finds the public and API-key allowlists among the scanned routes", () => {
    expect(PUBLIC_ROUTES.size).toBe(PUBLIC_API_PATHS.size);
    expect(API_KEY_ROUTES.size).toBeGreaterThan(0);
  });

  it.each(routeFiles)("$rel guards every exported handler", ({ full, rel }) => {
    const source = readFileSync(full, "utf8");
    const handlerCount = [...source.matchAll(HANDLER_EXPORT)].length;
    expect(handlerCount).toBeGreaterThan(0);

    if (PUBLIC_ROUTES.has(rel)) return;

    const guard = API_KEY_ROUTES.has(rel) ? /requireDiscordApiKey\(/g : /requireAdmin\(/g;
    expect([...source.matchAll(guard)].length).toBeGreaterThanOrEqual(handlerCount);
  });
});
