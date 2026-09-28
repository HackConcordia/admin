import { describe, expect, it } from "vitest";

import { findUnguardedHandlers } from "@/test/route-guard-scan";

describe("findUnguardedHandlers", () => {
  it("returns [] when every handler is guarded", () => {
    const source = `
      import { requireAdmin } from "@/lib/require-admin";

      export const GET = async (req) => {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        return Response.json({});
      };

      export const POST = async (req) => {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual([]);
  });

  it("flags a handler with no guard call when a sibling handler is guarded", () => {
    const source = `
      export const GET = async (req) => {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        return Response.json({});
      };

      export const POST = async (req) => {
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual(["POST"]);
  });

  it("does not let a guard mentioned only in a comment count", () => {
    const source = `
      export const GET = async (req) => {
        // requireAdmin(req) used to be called here
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual(["GET"]);
  });

  it("does not let a guard mentioned only inside a string literal count", () => {
    const source = `
      export const GET = async (req) => {
        const note = "remember to call requireAdmin( ) before shipping";
        return Response.json({ note });
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual(["GET"]);
  });

  it("treats two guard calls in one handler and zero in another as one unguarded handler", () => {
    const source = `
      export const GET = async (req) => {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        const again = await requireAdmin(req);
        return Response.json({ again });
      };

      export const POST = async (req) => {
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual(["POST"]);
  });

  it("handles the export async function METHOD(...) { } form", () => {
    const source = `
      export async function GET(req) {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        return Response.json({});
      }

      export async function POST(req) {
        return Response.json({});
      }
    `;
    expect(findUnguardedHandlers(source)).toEqual(["POST"]);
  });

  it("handles the export const METHOD = async (...) => form", () => {
    const source = `
      export const GET = async (req) => {
        const auth = await requireAdmin(req);
        if (!auth.ok) return auth.response;
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual([]);
  });

  it("counts a guard placed as the first statement inside a try block as guarded", () => {
    const source = `
      export const GET = async (req) => {
        try {
          const auth = await requireAdmin(req);
          if (!auth.ok) return auth.response;
          return Response.json({});
        } catch (error) {
          return Response.json({ error: true }, { status: 500 });
        }
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual([]);
  });

  it("accepts requireDiscordApiKey as a valid guard", () => {
    const source = `
      export const GET = async (req) => {
        const keyCheck = requireDiscordApiKey(req);
        if (!keyCheck.ok) return keyCheck.response;
        return Response.json({});
      };
    `;
    expect(findUnguardedHandlers(source)).toEqual([]);
  });
});
