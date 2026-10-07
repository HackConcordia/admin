// GENERATED from registration-website-conuhacks-10/my-app/emails — edit there and run npm run emails:sync
// Event facts, links and fixed kit wording, in one place for every template.
// No process.env here: the kit is copied verbatim into the admin app.
// French body copy (here and in templates/) puts a no-break space (\u00a0) before : ! ? ;
// so the mark never wraps onto a line of its own. Subjects keep ordinary spaces.

import type { CopyLanguage } from "../types";

/** Production asset host, also used by dev test sends so images always load. */
export const ASSET_BASE_URL = "https://register.conuhacks.io/email";

export const ASSETS = {
  logo: `${ASSET_BASE_URL}/logo@2x.png`,
  instagram: `${ASSET_BASE_URL}/instagram@2x.png`,
  linkedin: `${ASSET_BASE_URL}/linkedin@2x.png`,
} as const;

/** Contact and reply-to address shown in every footer. */
export const CONTACT_EMAIL = "team.hackconcordia@ecaconcordia.ca";

export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/conuhacks",
  linkedin: "https://www.linkedin.com/company/hackconcordia",
} as const;

export const EVENT = {
  name: "ConUHacks XI",
  wordmark: "CONUHACKS XI",
  headerDate: "06–07.02.2027 · MONTRÉAL",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=1450+Rue+Guy+Montreal+QC+H3H+0A1",
  date: {
    fr: "samedi 6 et le dimanche 7 février 2027",
    en: "Saturday, February 6 and Sunday, February 7, 2027",
  },
  /** Written "<building> (<address>)"; only the address links to Google Maps (spec section 4). */
  venue: {
    fr: { building: "pavillon John-Molson de l'Université Concordia", address: "1450, rue Guy, Montréal, QC H3H 0A1" },
    en: { building: "Concordia's John Molson Building", address: "1450 Rue Guy, Montréal, QC H3H 0A1" },
  },
} as const satisfies {
  name: string;
  wordmark: string;
  headerDate: string;
  mapsUrl: string;
  date: Record<CopyLanguage, string>;
  venue: Record<CopyLanguage, { building: string; address: string }>;
};

export interface KitText {
  /** Muted label above a language block when the email is bilingual. */
  languageLabel: string;
  /** "Bonjour" / "Hi"; the kit adds the name (if any) and the comma. */
  greeting: string;
  signature: string;
  footerQuestions: string;
  footerReason: string;
}

export const KIT_TEXT: Record<CopyLanguage, KitText> = {
  fr: {
    languageLabel: "FRANÇAIS",
    greeting: "Bonjour",
    signature: "L'équipe HackConcordia",
    footerQuestions: "Des questions\u00a0? Écrivez-nous à",
    footerReason: "Vous recevez ce courriel parce que vous vous êtes inscrit(e) à ConUHacks XI.",
  },
  en: {
    languageLabel: "ENGLISH",
    greeting: "Hi",
    signature: "The HackConcordia Team",
    footerQuestions: "Questions? Write to us at",
    footerReason: "You're receiving this email because you signed up for ConUHacks XI.",
  },
};

/** Last footer line, the same in every language. */
export const FOOTER_ORGANIZER_LINE = "HackConcordia · Université Concordia, Montréal";
