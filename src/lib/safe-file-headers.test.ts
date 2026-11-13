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

  it("always sets nosniff", () => {
    for (const mimetype of ["application/pdf", "text/html", undefined, "application/json"]) {
      const headers = safeFileHeaders(mimetype, "resume.pdf");
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    }
  });

  it("omits Content-Security-Policy for PDFs so the browser PDF viewer works", () => {
    const headers = safeFileHeaders("application/pdf", "resume.pdf");
    expect(headers["Content-Security-Policy"]).toBeUndefined();
  });

  it("includes Content-Security-Policy sandbox for non-PDF files", () => {
    const csp = "sandbox; default-src 'none'";

    const htmlHeaders = safeFileHeaders("text/html", "file.html");
    expect(htmlHeaders["Content-Security-Policy"]).toBe(csp);

    const octetHeaders = safeFileHeaders(undefined, "unknown.bin");
    expect(octetHeaders["Content-Security-Policy"]).toBe(csp);

    const docxHeaders = safeFileHeaders(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "resume.docx",
    );
    expect(docxHeaders["Content-Security-Policy"]).toBe(csp);
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

  it("never throws on a non-Latin-1 name, and keeps the real name in filename*", () => {
    // The stored name that broke the download: "c" + U+0327 COMBINING CEDILLA (macOS spelling).
    const decomposed = "Sabrina CV - Français.pdf";
    const headers = safeFileHeaders("application/pdf", decomposed);
    expect(() => new Headers(headers)).not.toThrow();
    expect(headers["Content-Disposition"]).toBe(
      "inline; filename=\"Sabrina CV - Francais.pdf\"; filename*=UTF-8''Sabrina%20CV%20-%20Fran%C3%A7ais.pdf",
    );
  });

  it("keeps the quoted filename printable ASCII for any input", () => {
    for (const name of ["Résumé.pdf", "CV 🚀 简历.pdf", "bad\ud800.pdf"]) {
      const headers = safeFileHeaders("application/pdf", name);
      expect(() => new Headers(headers)).not.toThrow();
      const [, quoted] = headers["Content-Disposition"].match(/filename="([^"]*)"/) ?? [];
      expect(quoted).toMatch(/^[\x20-\x7e]+$/);
    }
  });
});
