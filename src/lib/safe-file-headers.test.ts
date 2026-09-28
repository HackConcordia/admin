import { describe, expect, it } from "vitest";

import { safeFileHeaders } from "@/lib/safe-file-headers";

describe("safeFileHeaders", () => {
  it("serves a PDF inline with its real content type", () => {
    const headers = safeFileHeaders("application/pdf", "resume.pdf");
    expect(headers["Content-Type"]).toBe("application/pdf");
    expect(headers["Content-Disposition"]).toContain("inline");
  });

  it("degrades an unrecognized mimetype to octet-stream and forces a download", () => {
    const headers = safeFileHeaders("text/html", "resume.pdf");
    expect(headers["Content-Type"]).toBe("application/octet-stream");
    expect(headers["Content-Disposition"]).toContain("attachment");
  });

  it("treats a missing mimetype as unrecognized", () => {
    const headers = safeFileHeaders(undefined, "resume.pdf");
    expect(headers["Content-Type"]).toBe("application/octet-stream");
    expect(headers["Content-Disposition"]).toContain("attachment");
  });

  it("serves Word documents as an attachment, not inline", () => {
    const docx = safeFileHeaders(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "resume.docx",
    );
    expect(docx["Content-Type"]).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(docx["Content-Disposition"]).toContain("attachment");

    const doc = safeFileHeaders("application/msword", "resume.doc");
    expect(doc["Content-Type"]).toBe("application/msword");
    expect(doc["Content-Disposition"]).toContain("attachment");
  });

  it("always sets nosniff and a sandboxing CSP", () => {
    for (const mimetype of ["application/pdf", "text/html", undefined, "application/json"]) {
      const headers = safeFileHeaders(mimetype, "resume.pdf");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["Content-Security-Policy"]).toBe("sandbox; default-src 'none'");
    }
  });

  it("sanitizes a filename that attempts header/path injection", () => {
    const headers = safeFileHeaders("application/pdf", 'evil"; x-injected: true\r\nSet-Cookie: a=b\nfilename="../../etc/passwd');
    expect(headers["Content-Disposition"]).not.toMatch(/[\r\n]/);
    const [, quotedName] = headers["Content-Disposition"].match(/filename="([^]*?)"; filename\*=/) ?? [];
    expect(quotedName).toBeDefined();
    expect(quotedName).not.toContain('"');
    expect(quotedName).not.toContain("/");
    expect(quotedName).not.toContain("\\");
  });

  it("falls back to a generic filename when sanitizing empties it out", () => {
    const headers = safeFileHeaders("application/pdf", '"""');
    expect(headers["Content-Disposition"]).toContain('filename="download"');
  });
});
