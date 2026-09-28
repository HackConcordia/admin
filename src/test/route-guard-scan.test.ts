import { describe, expect, it } from "vitest";

import { findHandlerExports, findUnguardedHandlers } from "@/test/route-guard-scan";

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

  it("handles the plain export function METHOD(...) { } form (no async keyword)", () => {
    const source = `
      export function GET(req) {
        const auth = requireAdmin(req);
        return Response.json({});
      }
    `;
    expect(findUnguardedHandlers(source)).toEqual([]);
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

  describe("cross-segment leakage (fix round 2, NEW 1)", () => {
    it("does not let a guard call in an unexported helper AFTER the last handler count", () => {
      const source = `
        export async function POST(req) {
          return Response.json({});
        }

        function unused(req) {
          return requireAdmin(req);
        }
      `;
      expect(findUnguardedHandlers(source)).toEqual(["POST"]);
    });

    it("does not let a guard call in an unexported helper BETWEEN two handlers count", () => {
      const source = `
        export async function GET(req) {
          return Response.json({});
        }

        function unused(req) {
          return requireAdmin(req);
        }

        export async function POST(req) {
          const auth = await requireAdmin(req);
          if (!auth.ok) return auth.response;
          return Response.json({});
        }
      `;
      expect(findUnguardedHandlers(source)).toEqual(["GET"]);
    });
  });

  describe("unrecognized exports (fix round 2, NEW 2)", () => {
    it("handles a typed export const METHOD: (...) => ... = form when guarded", () => {
      const source = `
        export const GET: (req: NextRequest) => Promise<Response> = async (req) => {
          const auth = await requireAdmin(req);
          if (!auth.ok) return auth.response;
          return Response.json({});
        };
      `;
      expect(findUnguardedHandlers(source)).toEqual([]);
    });

    it("handles a typed export const METHOD: (...) => ... = form when unguarded", () => {
      const source = `
        export const GET: (req: NextRequest) => Promise<Response> = async (req) => {
          return Response.json({});
        };
      `;
      expect(findUnguardedHandlers(source)).toEqual(["GET"]);
    });

    it("fails closed on an export { x as METHOD } re-export it cannot follow to a body", () => {
      const source = `
        async function localGet(req) {
          const auth = await requireAdmin(req);
          if (!auth.ok) return auth.response;
          return Response.json({});
        }

        export { localGet as GET };
      `;
      expect(findUnguardedHandlers(source)).toEqual(["GET"]);
    });

    it("fails closed on a plain export { METHOD } re-export list", () => {
      const source = `
        const GET = async (req) => {
          const auth = await requireAdmin(req);
          if (!auth.ok) return auth.response;
          return Response.json({});
        };

        export { GET };
      `;
      expect(findUnguardedHandlers(source)).toEqual(["GET"]);
    });
  });
});

describe("findHandlerExports", () => {
  it("finds every direct handler export in a file", () => {
    const source = `
      export const GET = async (req) => Response.json({});
      export async function POST(req) { return Response.json({}); }
    `;
    expect(findHandlerExports(source)).toEqual(["GET", "POST"]);
  });

  it("finds a typed export const declaration", () => {
    const source = `
      export const GET: (req: NextRequest) => Promise<Response> = async (req) => {
        return Response.json({});
      };
    `;
    expect(findHandlerExports(source)).toEqual(["GET"]);
  });

  it("finds a method named only in an export { ... } list", () => {
    const source = `
      async function localGet(req) {
        return Response.json({});
      }

      export { localGet as GET };
    `;
    expect(findHandlerExports(source)).toEqual(["GET"]);
  });
});
