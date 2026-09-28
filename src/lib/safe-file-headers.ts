/**
 * Response headers for serving an applicant-uploaded GridFS file (resume / consent form) back
 * to an admin. The `mimetype` and `filename` both come from applicant-controlled metadata, so
 * neither is trusted as-is: the content type is allowlisted (anything else degrades to
 * `application/octet-stream`), `X-Content-Type-Options: nosniff` stops the browser from
 * second-guessing that content type, a sandboxing CSP disables script execution regardless of
 * the file's actual content, and the filename is sanitized before it goes anywhere near a
 * `Content-Disposition` header.
 */

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SAFE_MIME_TYPE = "application/octet-stream";

/** Strips quotes, CR/LF, and path separators so the value is safe inside a header. */
function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/["'\r\n\\/]/g, "").trim();
  return cleaned || "download";
}

export function safeFileHeaders(mimetype: string | undefined, filename: string): Record<string, string> {
  const contentType = mimetype && ALLOWED_MIME_TYPES.has(mimetype) ? mimetype : SAFE_MIME_TYPE;
  const disposition = contentType === "application/pdf" ? "inline" : "attachment";
  const safeName = sanitizeFilename(filename);
  const utf8Name = encodeURIComponent(safeName);

  return {
    "Content-Type": contentType,
    "Content-Disposition": `${disposition}; filename="${safeName}"; filename*=UTF-8''${utf8Name}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  };
}
