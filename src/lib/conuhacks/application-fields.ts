/**
 * Single source of truth for the ConUHacks XI applicant fields the dashboard shows and super admins
 * edit. Mirrors the registration form (registration-website-conuhacks-10/my-app/app/dashboard/
 * components/application-form/*Section.tsx): same option values, same "Other" follow-ups, same
 * level rules (field-options.ts). Client-safe: the detail view imports it.
 */
import { AgeOptions } from "@/constants/AgeOptions";
import { Cities } from "@/constants/Cities";
import { CommunicationLanguages } from "@/constants/CommunicationLanguages";
import { Countries } from "@/constants/Countries";
import { CurrentYears } from "@/constants/CurrentYears";
import { DegreeLengths } from "@/constants/DegreeLengths";
import { DegreeTypes } from "@/constants/DegreeTypes";
import { DietaryRestrictions } from "@/constants/DietaryRestrictions";
import { Disciplines } from "@/constants/Disciplines";
import { Genders } from "@/constants/Genders";
import { HackathonCounts } from "@/constants/HackathonCounts";
import { JobRoles } from "@/constants/JobRoles";
import { JobTypes } from "@/constants/JobTypes";
import { LanguagesSpoken } from "@/constants/LanguagesSpoken";
import { Pronouns } from "@/constants/Pronouns";
import { SchoolingLevels } from "@/constants/SchoolingLevels";
import { Schools } from "@/constants/Schools";
import { TShirtSizes } from "@/constants/TShirtSizes";
import { UnderrepresentedGroups } from "@/constants/UnderrepresentedGroups";
import { formatHackathons, formatList, formatTravelAnswer, formatYesNo, optionLabel } from "@/lib/conuhacks/display";
import { currentYearValues, isOtherLevel, requiresDegreeDetails } from "@/lib/conuhacks/field-options";
import { listIncludes, parseListField } from "@/lib/conuhacks/list-field";

export type FieldInput = "text" | "textarea" | "select" | "multiselect" | "boolean" | "nullableBoolean" | "count";

export interface FieldOption {
  value: string;
  label: string;
}

/** Applicant-answered fields (names, email, status, files and admin fields are handled separately). */
export const APPLICANT_FIELD_KEYS = [
  "age", "phoneNumber", "country", "city", "communicationLanguage", "languagesSpoken", "languagesSpokenOther",
  "isStudentOrRecentGraduate", "currentLevelOfSchooling", "otherLevelOfSchooling", "school", "schoolOther",
  "currentYear", "degreeLength", "degreeType", "discipline", "disciplineOther",
  "hackathons", "coolProject", "excitedAbout",
  "isRegisteredForCoop", "jobRolesLookingFor", "jobTypesInterested", "jobTypesInterestedOther",
  "travelReimbursement", "shirtSize", "dietaryRestrictions", "dietaryRestrictionsDescription",
  "gender", "pronouns", "underrepresented", "github", "linkedin",
] as const;

export type ApplicantFieldKey = (typeof APPLICANT_FIELD_KEYS)[number];
export type ApplicantFieldValues = Partial<Record<ApplicantFieldKey, unknown>>;

export type FieldStorage = "string" | "nullableString" | "boolean" | "nullableBoolean" | "count" | "jsonInArray";

/** How each field is stored in the applications collection (registration app format). */
export const FIELD_STORAGE: Readonly<Record<ApplicantFieldKey, FieldStorage>> = {
  age: "string", phoneNumber: "string", country: "string", city: "string", communicationLanguage: "string",
  languagesSpoken: "jsonInArray", languagesSpokenOther: "string", isStudentOrRecentGraduate: "boolean",
  currentLevelOfSchooling: "string", otherLevelOfSchooling: "string", school: "string", schoolOther: "string",
  currentYear: "string", degreeLength: "string", degreeType: "string", discipline: "string", disciplineOther: "string",
  hackathons: "count", coolProject: "string", excitedAbout: "string",
  isRegisteredForCoop: "boolean", jobRolesLookingFor: "string", jobTypesInterested: "jsonInArray", jobTypesInterestedOther: "string",
  travelReimbursement: "nullableBoolean", shirtSize: "string", dietaryRestrictions: "jsonInArray", dietaryRestrictionsDescription: "string",
  gender: "nullableString", pronouns: "nullableString", underrepresented: "string", github: "nullableString", linkedin: "nullableString",
};

/**
 * Fields a regular reviewer never receives (Q2): resolveSections emits them only for super admins,
 * and redactSensitiveApplicantFields blanks them before any response or page prop leaves the server.
 */
export const SUPER_ADMIN_ONLY_FIELD_KEYS = [
  "age", "phoneNumber", "shirtSize", "dietaryRestrictions", "dietaryRestrictionsDescription", "gender", "pronouns", "underrepresented",
] as const satisfies readonly ApplicantFieldKey[];

/** Rendered in the view's "Links & Documents" block (through safeExternalUrl), not in a section. */
export const LINK_FIELD_KEYS = ["github", "linkedin"] as const satisfies readonly ApplicantFieldKey[];

/** Free-text answers long enough to hold paragraphs (every other string is capped much shorter). */
export const LONG_TEXT_FIELD_KEYS = ["coolProject", "excitedAbout", "dietaryRestrictionsDescription"] as const satisfies readonly ApplicantFieldKey[];

/** Radix Select can't hold "", so "not answered" (null) travels through the edit form as this value. */
export const UNANSWERED_CHOICE = "__unanswered__";

export interface ResolvedField {
  key: ApplicantFieldKey;
  label: string;
  input: FieldInput;
  options?: readonly FieldOption[];
}

export type SectionId = "personal" | "location" | "education" | "hackathon" | "career" | "logistics" | "demographics";

export interface ResolvedSection {
  id: SectionId;
  title: string;
  fields: ResolvedField[];
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const hasValue = (value: unknown): boolean => text(value) !== "";
const withoutPlaceholder = (options: readonly FieldOption[]): FieldOption[] => options.filter((option) => option.value !== "");
const YES_NO: readonly FieldOption[] = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

function field(key: ApplicantFieldKey, label: string, input: FieldInput, options?: readonly FieldOption[]): ResolvedField {
  return options ? { key, label, input, options } : { key, label, input };
}

export function currentYearOptionsFor(level: unknown): readonly FieldOption[] {
  return currentYearValues(level) ? CurrentYears(String(level), "en") : [];
}

export function degreeTypeOptionsFor(level: unknown): readonly FieldOption[] {
  return typeof level === "string" ? DegreeTypes(level, "en") : [];
}

/** The applicant's travel answer. The view renders it in its own block, next to the admin decision. */
export const TRAVEL_FIELD: ResolvedField = field("travelReimbursement", "Asked for travel reimbursement", "nullableBoolean", YES_NO);

function personalFields(values: ApplicantFieldValues, isSuperAdmin: boolean): ResolvedField[] {
  const fields: ResolvedField[] = isSuperAdmin
    ? [field("age", "Age", "select", AgeOptions("en")), field("phoneNumber", "Phone number", "text")]
    : [];
  fields.push(
    field("communicationLanguage", "Communication language", "select", CommunicationLanguages("en")),
    field("languagesSpoken", "Languages spoken", "multiselect", LanguagesSpoken("en")),
  );
  if (listIncludes(values.languagesSpoken, "other") || hasValue(values.languagesSpokenOther)) {
    fields.push(field("languagesSpokenOther", "Languages spoken (other)", "text"));
  }
  return fields;
}

function locationFields(values: ApplicantFieldValues): ResolvedField[] {
  const fields = [field("country", "Country", "select", Countries("en"))];
  if (text(values.country) === "CA" || hasValue(values.city)) fields.push(field("city", "City", "select", Cities("en")));
  return fields;
}

function educationFields(values: ApplicantFieldValues): ResolvedField[] {
  const level = values.currentLevelOfSchooling;
  const fields = [
    field("isStudentOrRecentGraduate", "Student or graduated within the last year", "boolean"),
    field("currentLevelOfSchooling", "Level of schooling", "select", SchoolingLevels("en")),
  ];
  if (isOtherLevel(level) || hasValue(values.otherLevelOfSchooling)) {
    fields.push(field("otherLevelOfSchooling", "Level of schooling (other)", "text"));
  }
  fields.push(field("school", "School", "select", Schools("en")));
  if (text(values.school).toLowerCase() === "other" || hasValue(values.schoolOther)) {
    fields.push(field("schoolOther", "School (other)", "text"));
  }
  const years = currentYearOptionsFor(level);
  fields.push(years.length > 0 ? field("currentYear", "Current year", "select", years) : field("currentYear", "Current year", "text"));
  if (requiresDegreeDetails(level) || hasValue(values.degreeLength) || hasValue(values.degreeType)) {
    fields.push(
      field("degreeLength", "Degree length", "select", DegreeLengths("en")),
      field("degreeType", "Degree type", "select", degreeTypeOptionsFor(level)),
    );
  }
  fields.push(field("discipline", "Discipline", "select", Disciplines("en")));
  if (text(values.discipline) === "other" || hasValue(values.disciplineOther)) {
    fields.push(field("disciplineOther", "Discipline (other)", "text"));
  }
  return fields;
}

function hackathonFields(): ResolvedField[] {
  return [
    field("hackathons", "Hackathons attended", "count", HackathonCounts("en")),
    field("coolProject", "A cool project", "textarea"),
    field("excitedAbout", "Excited about", "textarea"),
  ];
}

function careerFields(values: ApplicantFieldValues): ResolvedField[] {
  const fields = [field("isRegisteredForCoop", "Registered for co-op", "boolean")];
  const showJobs =
    values.isRegisteredForCoop === true || hasValue(values.jobRolesLookingFor) || parseListField(values.jobTypesInterested).length > 0;
  if (!showJobs) return fields;
  fields.push(
    field("jobRolesLookingFor", "Job role looking for", "select", JobRoles("en")),
    field("jobTypesInterested", "Job types interested in", "multiselect", JobTypes("en")),
  );
  if (listIncludes(values.jobTypesInterested, "other") || hasValue(values.jobTypesInterestedOther)) {
    fields.push(field("jobTypesInterestedOther", "Job types (other)", "text"));
  }
  return fields;
}

function logisticsFields(values: ApplicantFieldValues, isSuperAdmin: boolean): ResolvedField[] {
  if (!isSuperAdmin) return [];
  const fields = [
    field("shirtSize", "T-shirt size", "select", TShirtSizes("en")),
    field("dietaryRestrictions", "Dietary restrictions", "multiselect", DietaryRestrictions("en")),
  ];
  if (listIncludes(values.dietaryRestrictions, "other") || hasValue(values.dietaryRestrictionsDescription)) {
    fields.push(field("dietaryRestrictionsDescription", "Dietary restrictions (details)", "textarea"));
  }
  return fields;
}

function demographicFields(isSuperAdmin: boolean): ResolvedField[] {
  return isSuperAdmin
    ? [
        field("gender", "Gender", "select", withoutPlaceholder(Genders("en"))),
        field("pronouns", "Pronouns", "select", withoutPlaceholder(Pronouns("en"))),
        field("underrepresented", "Underrepresented group", "select", UnderrepresentedGroups("en")),
      ]
    : [];
}

/**
 * The sections to render for an application, given its current (or edited) values. Follow-up fields
 * appear when their trigger is picked or when they already hold a value, so stored data is never
 * hidden. Links and the travel answer are rendered by the view in their own blocks.
 */
export function resolveSections(values: ApplicantFieldValues, options: { isSuperAdmin: boolean }): ResolvedSection[] {
  const sections: ResolvedSection[] = [
    { id: "personal", title: "Personal Information", fields: personalFields(values, options.isSuperAdmin) },
    { id: "location", title: "Location", fields: locationFields(values) },
    { id: "education", title: "Education", fields: educationFields(values) },
    { id: "hackathon", title: "Hackathon", fields: hackathonFields() },
    { id: "career", title: "Career (co-op)", fields: careerFields(values) },
    { id: "logistics", title: "Logistics", fields: logisticsFields(values, options.isSuperAdmin) },
    { id: "demographics", title: "Demographics (optional)", fields: demographicFields(options.isSuperAdmin) },
  ];
  return sections.filter((section) => section.fields.length > 0);
}

/** What the view shows for a stored value: the option's label, Yes/No, "5+", or the list's labels. */
export function displayFieldValue(spec: ResolvedField, value: unknown): string {
  switch (spec.input) {
    case "boolean":
      return formatYesNo(value);
    case "nullableBoolean":
      return formatTravelAnswer(value);
    case "count":
      return formatHackathons(value);
    case "multiselect":
      return formatList(value, spec.options ?? []);
    case "select":
      return optionLabel(spec.options ?? [], value);
    default:
      return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
  }
}

/** Maps an edit-form choice back to the stored value: "true"/"false" for nullableBoolean, "0".."5" for count. */
export function parseChoice(input: FieldInput, choice: string): boolean | number | null {
  if (choice === UNANSWERED_CHOICE) return null;
  if (input === "nullableBoolean") return choice === "true";
  const count = Number(choice);
  return Number.isInteger(count) ? count : null;
}
