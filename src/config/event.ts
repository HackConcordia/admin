/**
 * Event-specific settings for this deployment, read from env. Server-only.
 * EVENT_ID and EVENT_MEALS must equal the ConUHacks XI event-checkin deployment's values
 * (roadmap contract C5), so badge mappings and meal records written by either app match.
 */
export const MEAL_TYPES = ["breakfast", "lunch", "snacks", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface MealSlot {
  date: string; // YYYY-MM-DD
  type: MealType;
}

/**
 * What the decision emails need. A bad EVENT_ID or EVENT_MEALS must not block them. The event
 * name, dates and venue in the emails come from the email kit (src/emails/kit/brand.ts); the
 * reply-to address is read by src/utils/sendEmail.ts through readContactEmail.
 */
export interface EmailEventConfig {
  /** Shown on the meals page. */
  eventName: string;
  /** The registration app's URL: the admitted email's "Confirm on my dashboard" button. */
  registrationUrl: string;
  discordInviteUrl: string | null;
  travelGuidelinesUrl: string | null;
  travelGuidelinesUrlFr: string | null;
}

/** What organizer check-in and the meals page need: the badge event id and the meal schedule. */
export interface CheckInEventConfig {
  eventId: string;
  meals: MealSlot[];
}

export type EventConfig = EmailEventConfig & CheckInEventConfig;

export type EnvSource = Readonly<Record<string, string | undefined>>;

export class EventConfigError extends Error {
  /** The environment variable at fault, when there is one (names only, never values). */
  readonly variable: string | null;

  constructor(message: string, variable: string | null = null) {
    super(message);
    this.name = "EventConfigError";
    this.variable = variable;
  }
}

// Last year's ECA documents, used until new ones are set in TRAVEL_GUIDELINES_URL(_FR).
export const DEFAULT_TRAVEL_GUIDELINES_URL =
  "https://drive.google.com/file/d/1-7HbWwvpoTLa2Mpw406qMu4K0Dit9GOt/view?usp=drive_link";
export const DEFAULT_TRAVEL_GUIDELINES_URL_FR =
  "https://drive.google.com/file/d/1Bqh9FSkdL2RlPJEXvq7vAmCLb-T9pM1W/view?usp=drive_link";

export const DEFAULT_CONTACT_EMAIL = "team.hackconcordia@ecaconcordia.ca";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRealDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && (MEAL_TYPES as readonly string[]).includes(value);
}

export function parseMealSlots(raw: string | undefined): MealSlot[] {
  if (raw === undefined || raw.trim() === "") return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EventConfigError("EVENT_MEALS is not valid JSON", "EVENT_MEALS");
  }
  if (!Array.isArray(parsed)) {
    throw new EventConfigError("EVENT_MEALS must be a JSON array", "EVENT_MEALS");
  }

  return parsed.map((entry: unknown, index: number) => {
    if (typeof entry !== "object" || entry === null) {
      throw new EventConfigError(`EVENT_MEALS[${index}] must be an object like {"date":"2026-11-28","type":"lunch"}`, "EVENT_MEALS");
    }
    const { date, type } = entry as { date?: unknown; type?: unknown };
    if (typeof date !== "string" || !isRealDate(date)) {
      throw new EventConfigError(`EVENT_MEALS[${index}].date must be a real date in YYYY-MM-DD format`, "EVENT_MEALS");
    }
    if (!isMealType(type)) {
      throw new EventConfigError(`EVENT_MEALS[${index}].type must be one of ${MEAL_TYPES.join(", ")}`, "EVENT_MEALS");
    }
    return { date, type };
  });
}

function required(env: EnvSource, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new EventConfigError(`Missing required environment variable ${name}`, name);
  }
  return value;
}

function requiredObjectId(env: EnvSource, name: string): string {
  const value = required(env, name).toLowerCase();
  if (!OBJECT_ID_PATTERN.test(value)) {
    throw new EventConfigError(`${name} must be a 24-character hex MongoDB ObjectId`, name);
  }
  return value;
}

// Plain http is allowed only for a local registration app during development; every deployed
// URL (they end up in applicant emails) must be https. Only "localhost" counts as local, the same
// rule as the email kit's isEmailUrl (src/emails/kit/url.ts), which checks every link again:
// accepting 127.0.0.1 here would save decisions whose emails then fail to render.
const LOCAL_HOSTNAMES = new Set(["localhost"]);

function httpUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EventConfigError(`${name} must be an absolute https URL`);
  }
  if (url.protocol === "https:") return value;
  if (url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname)) return value;
  throw new EventConfigError(`${name} must be an absolute https URL (http is allowed only for localhost)`);
}

function optionalHttpUrl(env: EnvSource, name: string): string | null {
  const value = env[name]?.trim();
  return value ? httpUrl(value, name) : null;
}

/** CONTACT_EMAIL, or the default when unset: the reply-to of every email (read by src/utils/sendEmail.ts). */
export function readContactEmail(env: EnvSource): string {
  const value = env.CONTACT_EMAIL?.trim();
  if (!value) return DEFAULT_CONTACT_EMAIL;
  if (!EMAIL_PATTERN.test(value)) {
    throw new EventConfigError("CONTACT_EMAIL must be an email address");
  }
  return value;
}

export function readEmailEventConfig(env: EnvSource): EmailEventConfig {
  return {
    eventName: required(env, "EVENT_NAME"),
    registrationUrl: httpUrl(required(env, "REGISTRATION_URL"), "REGISTRATION_URL"),
    discordInviteUrl: optionalHttpUrl(env, "DISCORD_INVITE_URL"),
    travelGuidelinesUrl: optionalHttpUrl(env, "TRAVEL_GUIDELINES_URL") ?? DEFAULT_TRAVEL_GUIDELINES_URL,
    travelGuidelinesUrlFr: optionalHttpUrl(env, "TRAVEL_GUIDELINES_URL_FR") ?? DEFAULT_TRAVEL_GUIDELINES_URL_FR,
  };
}

/** EVENT_MEALS is required here (contract C5): without it organizer check-ins would skip the meal record volunteers create. */
export function readCheckInEventConfig(env: EnvSource): CheckInEventConfig {
  const eventId = requiredObjectId(env, "EVENT_ID");
  const meals = parseMealSlots(required(env, "EVENT_MEALS"));
  if (meals.length === 0) {
    throw new EventConfigError("EVENT_MEALS must list at least one meal", "EVENT_MEALS");
  }
  return { eventId, meals };
}

export function readEventConfig(env: EnvSource): EventConfig {
  return { ...readEmailEventConfig(env), ...readCheckInEventConfig(env) };
}

export const getEmailEventConfig = (): EmailEventConfig => readEmailEventConfig(process.env);

export const getCheckInEventConfig = (): CheckInEventConfig => readCheckInEventConfig(process.env);

export function getEventConfig(): EventConfig {
  return readEventConfig(process.env);
}
