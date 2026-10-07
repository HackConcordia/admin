/**
 * The emails an admin action sends to an applicant: the admit / waitlist / refuse decisions
 * (status route) and the Discord invite (Edit mode → Confirmed). Each one goes out in the
 * applicant's own language (`communicationLanguage`; bilingual when unset), through sendEmail,
 * which never throws. Callers send only after their write won and never undo the write when an
 * email fails.
 */
import type { EventConfig } from "@/config/event";
import { emailLanguage } from "@/emails/language";
import type { TravelDecision } from "@/emails/types";
import { sendEmail } from "@/utils/sendEmail";

export interface EmailApplicant {
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  communicationLanguage?: unknown;
}

/** The travel decision the status route just wrote (`parseTravelDecision`'s result). */
export interface TravelDecisionSummary {
  approved: boolean;
  amount?: number;
  currency?: string;
}

export const DECISION_EMAIL_KEYS = {
  Admitted: "admitted",
  Waitlisted: "waitlisted",
  Refused: "refused",
} as const;

export type DecisionStatus = keyof typeof DECISION_EMAIL_KEYS;

type EmailConfig = Pick<EventConfig, "registrationUrl" | "discordInviteUrl" | "travelGuidelinesUrl" | "travelGuidelinesUrlFr">;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** "firstName lastName", trimmed; "" when both are empty (the kit then greets with "Hi," / "Bonjour,"). */
export function applicantFullName(applicant: EmailApplicant): string {
  return [text(applicant.firstName), text(applicant.lastName)].filter(Boolean).join(" ");
}

export function isDecisionStatus(status: string): status is DecisionStatus {
  return Object.hasOwn(DECISION_EMAIL_KEYS, status);
}

function recipient(applicant: EmailApplicant) {
  return { to: text(applicant.email), lang: emailLanguage(applicant.communicationLanguage) };
}

/** No decision (or an approval without an amount) means no travel text; a decline means the "can't offer" paragraph. */
function travelData(travel: TravelDecisionSummary | undefined, config: EmailConfig): TravelDecision | undefined {
  if (!travel) return undefined;
  if (!travel.approved) return { approved: false };
  if (!travel.amount || !travel.currency) return undefined;
  const guidelinesUrl = {
    ...(config.travelGuidelinesUrl ? { en: config.travelGuidelinesUrl } : {}),
    ...(config.travelGuidelinesUrlFr ? { fr: config.travelGuidelinesUrlFr } : {}),
  };
  return { approved: true, amount: travel.amount, currency: travel.currency, guidelinesUrl };
}

function isHttpsUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/** The admitted / waitlisted / refused email. `travel` only matters (and is only sent) for admitted. */
export async function sendDecisionEmail(
  status: DecisionStatus,
  applicant: EmailApplicant,
  config: EmailConfig,
  travel?: TravelDecisionSummary,
): Promise<boolean> {
  const fullName = applicantFullName(applicant);
  const key = DECISION_EMAIL_KEYS[status];
  if (key === "admitted") {
    const travelBlock = travelData(travel, config);
    return sendEmail("admitted", {
      ...recipient(applicant),
      data: { fullName, dashboardUrl: config.registrationUrl, ...(travelBlock ? { travel: travelBlock } : {}) },
    });
  }
  return sendEmail(key, { ...recipient(applicant), data: { fullName } });
}

/** The Discord invite; returns false without sending when no https DISCORD_INVITE_URL is configured. */
export async function sendDiscordInviteEmail(applicant: EmailApplicant, config: Pick<EmailConfig, "discordInviteUrl">): Promise<boolean> {
  if (!isHttpsUrl(config.discordInviteUrl)) {
    console.log("[Email] DISCORD_INVITE_URL is not an https URL; skipping the Discord invite email");
    return false;
  }
  return sendEmail("discordInvite", {
    ...recipient(applicant),
    data: { fullName: applicantFullName(applicant), discordUrl: config.discordInviteUrl },
  });
}
