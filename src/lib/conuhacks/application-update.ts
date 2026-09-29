/**
 * Turns the super-admin edit form's body into a validated $set for the applications collection.
 * Writable: the names, status, registry fields and reviewer notes. The admin-only travel decision
 * belongs to the super-admin status route and is ignored here, like email, ids, files and
 * unknown keys (e.g. removed ConUHacks X fields). Values keep the
 * registration app's storage format (lists as ['["a","b"]']). Selects are checked against the
 * registration's own option values, hidden follow-ups are cleared with the registration's own rule
 * (conditional-fields.ts), and a value equal to the stored one is always accepted, so an old or
 * hand-made answer never blocks saving an unrelated field.
 */
import { Cities } from "@/constants/Cities";
import { Countries } from "@/constants/Countries";
import { DietaryRestrictions } from "@/constants/DietaryRestrictions";
import { Genders } from "@/constants/Genders";
import { JobRoles } from "@/constants/JobRoles";
import { JobTypes } from "@/constants/JobTypes";
import { Pronouns } from "@/constants/Pronouns";
import { Schools } from "@/constants/Schools";
import { TShirtSizes } from "@/constants/TShirtSizes";
import { UnderrepresentedGroups } from "@/constants/UnderrepresentedGroups";
import {
  APPLICANT_FIELD_KEYS,
  FIELD_STORAGE,
  LINK_FIELD_KEYS,
  LONG_TEXT_FIELD_KEYS,
  type ApplicantFieldKey,
} from "@/lib/conuhacks/application-fields";
import { clearHiddenFields } from "@/lib/conuhacks/conditional-fields";
import {
  AGE_VALUES,
  COMMUNICATION_LANGUAGES,
  DEGREE_LENGTHS,
  DISCIPLINES,
  LANGUAGES_SPOKEN,
  MAX_HACKATHON_COUNT,
  SCHOOLING_LEVELS,
  currentYearValues,
  degreeTypeValues,
  requiresDegreeDetails,
} from "@/lib/conuhacks/field-options";
import { parseListField } from "@/lib/conuhacks/list-field";
import { safeExternalUrl } from "@/lib/safe-external-url";
import { APPLICATION_STATUSES, CHECKED_IN_STATUS, isCheckedInStatus } from "@/lib/status";

export type ApplicationUpdate = { ok: true; set: Record<string, unknown> } | { ok: false; error: string };

export interface ApplicationUpdateContext {
  /** The stored document. Its currentLevelOfSchooling validates year/degree when the body omits the level. */
  stored?: Record<string, unknown> | null;
}

type Body = Record<string, unknown>;
type FieldResult = { ok: true; value: unknown } | { ok: false; error: string };
type PartResult = { ok: true; set: Record<string, unknown> } | { ok: false; error: string };

const NAME_MAX = 100;
const SHORT_TEXT_MAX = 200;
const LONG_TEXT_MAX = 5000;
const LINK_MAX = 500;
const LIST_MAX = 50;
const REQUIRED_NAME_FIELDS = ["firstName", "lastName"] as const;

const valuesOf = (options: readonly { value: string }[]): string[] => options.map((option) => option.value);

const FIXED_OPTIONS: Partial<Record<ApplicantFieldKey, readonly string[]>> = {
  age: AGE_VALUES,
  communicationLanguage: COMMUNICATION_LANGUAGES,
  currentLevelOfSchooling: SCHOOLING_LEVELS,
  discipline: DISCIPLINES,
  degreeLength: DEGREE_LENGTHS,
  country: valuesOf(Countries("en")),
  city: valuesOf(Cities("en")),
  school: valuesOf(Schools("en")),
  shirtSize: valuesOf(TShirtSizes("en")),
  underrepresented: valuesOf(UnderrepresentedGroups("en")),
  jobRolesLookingFor: valuesOf(JobRoles("en")),
  gender: valuesOf(Genders("en")),
  pronouns: valuesOf(Pronouns("en")),
};

const MULTI_OPTIONS: Partial<Record<ApplicantFieldKey, readonly string[]>> = {
  dietaryRestrictions: valuesOf(DietaryRestrictions("en")),
  languagesSpoken: LANGUAGES_SPOKEN,
  jobTypesInterested: valuesOf(JobTypes("en")),
};

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const accept = (value: unknown): FieldResult => ({ ok: true, value });
const isPlainObject = (value: unknown): value is Body => typeof value === "object" && value !== null && !Array.isArray(value);
const includesKey = (list: readonly string[], key: string): boolean => list.includes(key);

function maxLengthFor(key: ApplicantFieldKey): number {
  if (includesKey(LINK_FIELD_KEYS, key)) return LINK_MAX;
  return includesKey(LONG_TEXT_FIELD_KEYS, key) ? LONG_TEXT_MAX : SHORT_TEXT_MAX;
}

/** Absolute http(s) only, like the registration app's own rule (applicantView.ts). */
const isAbsoluteHttpUrl = (link: string): boolean => /^https?:\/\//i.test(link) && safeExternalUrl(link) !== null;

function normalizeString(key: ApplicantFieldKey, value: unknown, storedValue: unknown): FieldResult {
  if (typeof value !== "string") return fail(`${key} must be a string`);
  const max = maxLengthFor(key);
  if (value.length > max) return fail(`${key} must be ${max} characters or fewer`);
  if (value === storedValue) return accept(value);
  if (includesKey(LINK_FIELD_KEYS, key)) {
    const link = value.trim();
    return link === "" || isAbsoluteHttpUrl(link) ? accept(link) : fail(`${key} must be an http(s) link`);
  }
  const allowed = FIXED_OPTIONS[key];
  if (allowed && value !== "" && !allowed.includes(value)) return fail(`Invalid value for ${key}`);
  return accept(value);
}

function normalizeCount(key: ApplicantFieldKey, value: unknown): FieldResult {
  if (value === null) return accept(null);
  const count = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= MAX_HACKATHON_COUNT
    ? accept(count)
    : fail(`${key} must be a whole number from 0 to ${MAX_HACKATHON_COUNT}`);
}

function normalizeList(key: ApplicantFieldKey, value: unknown, storedValue: unknown): FieldResult {
  const isStringArray = Array.isArray(value) && value.every((item) => typeof item === "string");
  if (typeof value !== "string" && !isStringArray) return fail(`${key} must be a list of strings`);
  const list = parseListField(value);
  if (list.length > LIST_MAX) return fail(`${key} has too many entries`);
  const unchanged = JSON.stringify(list) === JSON.stringify(parseListField(storedValue));
  const allowed = MULTI_OPTIONS[key];
  if (!unchanged && allowed && list.some((item) => !allowed.includes(item))) return fail(`Invalid value for ${key}`);
  return accept([JSON.stringify(list)]);
}

function normalizeField(key: ApplicantFieldKey, value: unknown, storedValue: unknown): FieldResult {
  switch (FIELD_STORAGE[key]) {
    case "boolean":
      return typeof value === "boolean" ? accept(value) : fail(`${key} must be true or false`);
    case "nullableBoolean":
      return value === null || typeof value === "boolean" ? accept(value) : fail(`${key} must be true, false or null`);
    case "count":
      return normalizeCount(key, value);
    case "jsonInArray":
      return normalizeList(key, value, storedValue);
    case "nullableString":
      return value === null ? accept(null) : normalizeString(key, value, storedValue);
    default:
      return normalizeString(key, value, storedValue);
  }
}

function parseNames(body: Body): PartResult {
  const set: Record<string, unknown> = {};
  for (const key of REQUIRED_NAME_FIELDS) {
    const value = body[key];
    if (typeof value !== "string" || value.trim() === "") return fail(`Missing required field: ${key}`);
    const trimmed = value.trim();
    if (trimmed.length > NAME_MAX) return fail(`${key} must be ${NAME_MAX} characters or fewer`);
    set[key] = trimmed;
  }
  return { ok: true, set };
}

function parseStatus(value: unknown): PartResult {
  if (value === undefined) return { ok: true, set: {} };
  if (typeof value !== "string" || !(APPLICATION_STATUSES as readonly string[]).includes(value)) return fail("Invalid status");
  return { ok: true, set: { status: isCheckedInStatus(value) ? CHECKED_IN_STATUS : value } };
}

/** Year and degree type depend on the level: the one in the update, else the stored one. */
function levelDependentError(set: Record<string, unknown>, stored: Body): string | null {
  const level = "currentLevelOfSchooling" in set ? set.currentLevelOfSchooling : stored.currentLevelOfSchooling;
  const year = set.currentYear;
  const years = currentYearValues(level);
  if (typeof year === "string" && year !== "" && year !== stored.currentYear && years && !years.includes(year)) {
    return "Invalid value for currentYear";
  }
  const degreeType = set.degreeType;
  if (
    requiresDegreeDetails(level) &&
    typeof degreeType === "string" &&
    degreeType !== "" &&
    degreeType !== stored.degreeType &&
    !degreeTypeValues(level).includes(degreeType)
  ) {
    return "Invalid value for degreeType";
  }
  return null;
}

function parseReviewerFields(body: Body): PartResult {
  const set: Record<string, unknown> = {};
  if (body.comments !== undefined) {
    if (body.comments !== null && typeof body.comments !== "string") return fail("comments must be a string");
    const comments = body.comments ?? "";
    if (comments.length > LONG_TEXT_MAX) return fail(`comments must be ${LONG_TEXT_MAX} characters or fewer`);
    set.comments = comments;
  }
  if (body.skillTags !== undefined) {
    const tags = body.skillTags;
    if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string")) return fail("skillTags must be a list of strings");
    const trimmed = tags.map((tag: string) => tag.trim()).filter(Boolean);
    if (trimmed.some((tag) => tag.length > SHORT_TEXT_MAX)) return fail(`skillTags must be ${SHORT_TEXT_MAX} characters or fewer`);
    set.skillTags = trimmed;
  }
  return { ok: true, set };
}

export function buildApplicationUpdate(body: unknown, context: ApplicationUpdateContext = {}): ApplicationUpdate {
  if (!isPlainObject(body)) return fail("Request body must be a JSON object");
  const stored: Body = context.stored ?? {};

  const names = parseNames(body);
  if (!names.ok) return names;
  const status = parseStatus(body.status);
  if (!status.ok) return status;

  const fields: Record<string, unknown> = {};
  for (const key of APPLICANT_FIELD_KEYS) {
    if (body[key] === undefined) continue;
    const result = normalizeField(key, body[key], stored[key]);
    if (!result.ok) return result;
    fields[key] = result.value;
  }

  const cleared = clearHiddenFields(fields, stored);
  // clearHiddenFields resets an unticked co-op's job types to an empty array; store the empty list the registration way.
  const emptied = Array.isArray(cleared.jobTypesInterested) && cleared.jobTypesInterested.length === 0;
  const visible = emptied ? { ...cleared, jobTypesInterested: ["[]"] } : cleared;
  const levelError = levelDependentError(visible, stored);
  if (levelError) return fail(levelError);

  const reviewer = parseReviewerFields(body);
  if (!reviewer.ok) return reviewer;

  return { ok: true, set: { ...names.set, ...status.set, ...visible, ...reviewer.set } };
}
