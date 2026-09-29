const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Returns an absolute http(s) URL for an applicant-supplied link, or null. A bare host such as
 * "github.com/ada" gets https://. Every other scheme (javascript:, data:, …) is refused, so the
 * result is safe to put in an href. A URL carrying credentials ("https://github.com@evil.dev",
 * a classic phishing disguise) is refused too. Client-safe.
 */
export function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = SCHEME_PATTERN.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
