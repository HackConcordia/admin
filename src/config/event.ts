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

export interface EventConfig {
  eventId: string;
  eventName: string;
  eventDatesLabel: string;
  eventDatesLabelFr: string;
  venue: string;
  venueFr: string;
  registrationUrl: string;
  contactEmail: string;
  discordInviteUrl: string | null;
  travelGuidelinesUrl: string | null;
  travelGuidelinesUrlFr: string | null;
  meals: MealSlot[];
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

export class EventConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventConfigError";
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
    throw new EventConfigError("EVENT_MEALS is not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new EventConfigError("EVENT_MEALS must be a JSON array");
  }

  return parsed.map((entry: unknown, index: number) => {
    if (typeof entry !== "object" || entry === null) {
      throw new EventConfigError(`EVENT_MEALS[${index}] must be an object like {"date":"2026-11-28","type":"lunch"}`);
    }
    const { date, type } = entry as { date?: unknown; type?: unknown };
    if (typeof date !== "string" || !isRealDate(date)) {
      throw new EventConfigError(`EVENT_MEALS[${index}].date must be a real date in YYYY-MM-DD format`);
    }
    if (!isMealType(type)) {
      throw new EventConfigError(`EVENT_MEALS[${index}].type must be one of ${MEAL_TYPES.join(", ")}`);
    }
    return { date, type };
  });
}

function required(env: EnvSource, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new EventConfigError(`Missing required environment variable ${name}`);
  }
  return value;
}

function requiredObjectId(env: EnvSource, name: string): string {
  const value = required(env, name).toLowerCase();
  if (!OBJECT_ID_PATTERN.test(value)) {
    throw new EventConfigError(`${name} must be a 24-character hex MongoDB ObjectId`);
  }
  return value;
}

// Plain http is allowed only for a local registration app during development; every deployed
// URL (they end up in applicant emails) must be https.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

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

function contactEmail(env: EnvSource): string {
  const value = env.CONTACT_EMAIL?.trim();
  if (!value) return DEFAULT_CONTACT_EMAIL;
  if (!EMAIL_PATTERN.test(value)) {
    throw new EventConfigError("CONTACT_EMAIL must be an email address");
  }
  return value;
}

export function readEventConfig(env: EnvSource): EventConfig {
  return {
    eventId: requiredObjectId(env, "EVENT_ID"),
    eventName: required(env, "EVENT_NAME"),
    eventDatesLabel: required(env, "EVENT_DATES_LABEL"),
    eventDatesLabelFr: required(env, "EVENT_DATES_LABEL_FR"),
    venue: required(env, "EVENT_VENUE"),
    venueFr: required(env, "EVENT_VENUE_FR"),
    registrationUrl: httpUrl(required(env, "REGISTRATION_URL"), "REGISTRATION_URL"),
    contactEmail: contactEmail(env),
    discordInviteUrl: optionalHttpUrl(env, "DISCORD_INVITE_URL"),
    travelGuidelinesUrl: optionalHttpUrl(env, "TRAVEL_GUIDELINES_URL") ?? DEFAULT_TRAVEL_GUIDELINES_URL,
    travelGuidelinesUrlFr: optionalHttpUrl(env, "TRAVEL_GUIDELINES_URL_FR") ?? DEFAULT_TRAVEL_GUIDELINES_URL_FR,
    meals: parseMealSlots(env.EVENT_MEALS),
  };
}

export function getEventConfig(): EventConfig {
  return readEventConfig(process.env);
}
