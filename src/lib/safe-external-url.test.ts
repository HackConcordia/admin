import { describe, expect, it } from "vitest";

import { safeExternalUrl } from "@/lib/safe-external-url";

describe("safeExternalUrl", () => {
  it("keeps http(s) links", () => {
    expect(safeExternalUrl("https://github.com/ada")).toBe("https://github.com/ada");
    expect(safeExternalUrl(" http://linkedin.com/in/ada ")).toBe("http://linkedin.com/in/ada");
  });

  it("adds https:// to a bare host", () => {
    expect(safeExternalUrl("github.com/ada")).toBe("https://github.com/ada");
  });

  it("refuses links that carry credentials (user:password@host phishing)", () => {
    expect(safeExternalUrl("https://github.com@evil.dev/ada")).toBeNull();
    expect(safeExternalUrl("https://user:pass@github.com/ada")).toBeNull();
    expect(safeExternalUrl("https://:pass@github.com/ada")).toBeNull();
    expect(safeExternalUrl("github.com@evil.dev")).toBeNull();
    expect(safeExternalUrl("https://github.com/ada@home")).toBe("https://github.com/ada@home");
  });

  it("refuses every other scheme and non-strings", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeExternalUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalUrl("")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });
});
