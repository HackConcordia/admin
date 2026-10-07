// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
import type { EmailLanguage } from "./types";

/**
 * Maps an application's `communicationLanguage` to the language an email is sent in:
 * "english" → "en", "french" → "fr", anything else (empty, missing, old documents) → "bilingual".
 */
export function emailLanguage(communicationLanguage: unknown): EmailLanguage {
  if (communicationLanguage === "english") return "en";
  if (communicationLanguage === "french") return "fr";
  return "bilingual";
}
