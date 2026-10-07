// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Every link in an email must be absolute https, or http://localhost in development.
// A bad URL is a bug in the sending app: rendering throws, so the email is never sent.

const LOCALHOST = /^http:\/\/localhost(:\d+)?(\/|$)/;

export function isEmailUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (LOCALHOST.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function emailUrl(value: string): string {
  if (!isEmailUrl(value)) {
    throw new Error("Email link must be an absolute https URL (or http://localhost in development)");
  }
  return value;
}
