/** CSV export of ConUHacks XI applications (super admins). Pure and client-safe. */
import { DegreeLengths } from "@/constants/DegreeLengths";
import { Genders } from "@/constants/Genders";
import { JobRoles } from "@/constants/JobRoles";
import { JobTypes } from "@/constants/JobTypes";
import { Pronouns } from "@/constants/Pronouns";
import { travelFilterClause } from "@/lib/conuhacks/application-query";
import {
  formatAge,
  formatCity,
  formatCommunicationLanguage,
  formatCountry,
  formatDietaryRestrictions,
  formatDiscipline,
  formatHackathons,
  formatLanguagesSpoken,
  formatLevel,
  formatSchool,
  formatTravelAnswer,
  formatYesNo,
  optionLabel,
} from "@/lib/conuhacks/display";
import { parseListField } from "@/lib/conuhacks/list-field";
import { isQuebecResident } from "@/lib/conuhacks/quebec";
import { CHECKED_IN_STATUS, CHECKED_IN_STATUSES, isCheckedInStatus } from "@/lib/status";

export const CSV_STATUS_FILTERS = ["all", "admitted", "confirmed", "checked-in", "travel-outside-quebec"] as const;
export type CsvStatusFilter = (typeof CSV_STATUS_FILTERS)[number];

export function isCsvStatusFilter(value: string): value is CsvStatusFilter {
  return (CSV_STATUS_FILTERS as readonly string[]).includes(value);
}

const SUBMITTED = { status: { $nin: ["Unverified", "Incomplete"] } };

export function csvStatusQuery(filter: CsvStatusFilter): Record<string, unknown> {
  switch (filter) {
    case "admitted":
      return { status: "Admitted" };
    case "confirmed":
      return { status: { $in: ["Confirmed", ...CHECKED_IN_STATUSES] } };
    case "checked-in":
      return { status: { $in: [...CHECKED_IN_STATUSES] } };
    case "travel-outside-quebec":
      return { $and: [SUBMITTED, travelFilterClause("outside-quebec")] };
    default:
      return SUBMITTED;
  }
}

export const CSV_FIELDS =
  "firstName lastName email status age phoneNumber country city communicationLanguage languagesSpoken languagesSpokenOther " +
  "isStudentOrRecentGraduate currentLevelOfSchooling otherLevelOfSchooling school schoolOther currentYear degreeLength degreeType " +
  "discipline disciplineOther hackathons coolProject excitedAbout isRegisteredForCoop jobRolesLookingFor jobTypesInterested " +
  "jobTypesInterestedOther travelReimbursement isTravelReimbursementApproved travelReimbursementAmount travelReimbursementCurrency " +
  "shirtSize dietaryRestrictions dietaryRestrictionsDescription gender pronouns underrepresented github linkedin resume teamId " +
  "processedBy isStarred createdAt";

type Doc = Record<string, unknown>;

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

function jobTypes(doc: Doc): string {
  const typed = text(doc.jobTypesInterestedOther);
  return parseListField(doc.jobTypesInterested)
    .map((value) => (value === "other" && typed ? `Other (${typed})` : optionLabel(JobTypes("en"), value)))
    .join(" | ");
}

function resumeOnFile(doc: Doc): string {
  const resume = doc.resume as { id?: unknown; size?: unknown } | undefined;
  return text(resume?.id) && Number(resume?.size) > 0 ? "yes" : "no";
}

function isoDate(value: unknown): string {
  const date = value instanceof Date ? value : typeof value === "string" && value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
}

const yesNoBlank = (value: unknown): string => (value === true ? "yes" : value === false ? "no" : "");

const COLUMNS: readonly { header: string; value: (doc: Doc) => string }[] = [
  { header: "Application ID", value: (doc) => String(doc._id ?? "") },
  { header: "First name", value: (doc) => text(doc.firstName) },
  { header: "Last name", value: (doc) => text(doc.lastName) },
  { header: "Email", value: (doc) => text(doc.email) },
  { header: "Status", value: (doc) => (isCheckedInStatus(doc.status) ? CHECKED_IN_STATUS : text(doc.status)) },
  { header: "Age", value: (doc) => formatAge(doc.age) },
  { header: "Phone", value: (doc) => text(doc.phoneNumber) },
  { header: "Country", value: (doc) => formatCountry(doc.country) },
  { header: "City", value: (doc) => formatCity(doc.city) },
  { header: "Quebec resident", value: (doc) => (isQuebecResident(doc.country, doc.city) ? "yes" : "no") },
  { header: "Communication language", value: (doc) => formatCommunicationLanguage(doc.communicationLanguage) },
  { header: "Languages spoken", value: (doc) => formatLanguagesSpoken(doc.languagesSpoken, doc.languagesSpokenOther) },
  { header: "Student or recent graduate", value: (doc) => formatYesNo(doc.isStudentOrRecentGraduate) },
  { header: "Level of schooling", value: (doc) => formatLevel(doc.currentLevelOfSchooling, doc.otherLevelOfSchooling) },
  { header: "School", value: (doc) => formatSchool(doc.school, doc.schoolOther) },
  { header: "Current year", value: (doc) => text(doc.currentYear) },
  { header: "Degree length", value: (doc) => optionLabel(DegreeLengths("en"), doc.degreeLength) },
  { header: "Degree type", value: (doc) => text(doc.degreeType) },
  { header: "Discipline", value: (doc) => formatDiscipline(doc.discipline, doc.disciplineOther) },
  { header: "Hackathons", value: (doc) => formatHackathons(doc.hackathons) },
  { header: "Cool project", value: (doc) => text(doc.coolProject) },
  { header: "Excited about", value: (doc) => text(doc.excitedAbout) },
  { header: "Co-op", value: (doc) => formatYesNo(doc.isRegisteredForCoop) },
  { header: "Job role", value: (doc) => optionLabel(JobRoles("en"), doc.jobRolesLookingFor) },
  { header: "Job types", value: jobTypes },
  { header: "Travel requested", value: (doc) => formatTravelAnswer(doc.travelReimbursement) },
  { header: "Travel approved", value: (doc) => yesNoBlank(doc.isTravelReimbursementApproved) },
  { header: "Travel amount", value: (doc) => (typeof doc.travelReimbursementAmount === "number" ? String(doc.travelReimbursementAmount) : "") },
  { header: "Travel currency", value: (doc) => text(doc.travelReimbursementCurrency) },
  { header: "T-shirt size", value: (doc) => text(doc.shirtSize) },
  { header: "Dietary restrictions", value: (doc) => formatDietaryRestrictions(doc.dietaryRestrictions) },
  { header: "Dietary details", value: (doc) => text(doc.dietaryRestrictionsDescription) },
  { header: "Gender", value: (doc) => optionLabel(Genders("en"), doc.gender) },
  { header: "Pronouns", value: (doc) => optionLabel(Pronouns("en"), doc.pronouns) },
  { header: "Underrepresented", value: (doc) => text(doc.underrepresented) },
  { header: "GitHub", value: (doc) => text(doc.github) },
  { header: "LinkedIn", value: (doc) => text(doc.linkedin) },
  { header: "Resume on file", value: resumeOnFile },
  { header: "Team ID", value: (doc) => text(doc.teamId) },
  { header: "Reviewer", value: (doc) => text(doc.processedBy) },
  { header: "Starred", value: (doc) => (doc.isStarred === true ? "yes" : "no") },
  { header: "Applied at", value: (doc) => isoDate(doc.createdAt) },
];

export const CSV_HEADERS: readonly string[] = COLUMNS.map((column) => column.header);

// Same rules as admin-hackdecouverte src/lib/hackdec/applications-csv.ts: \t and \r are dangerous on
// their own; =, +, -, @ are dangerous even behind leading whitespace (\s covers NBSP too).
const RAW_DANGEROUS_FIRST_CHAR = /^[\t\r]/;
const LEADING_WHITESPACE = /^\s+/;
const FORMULA_PREFIX = /^[=+\-@]/;
const NEEDS_QUOTES = /[",\r\n]/;

function startsLikeFormula(value: string): boolean {
  if (RAW_DANGEROUS_FIRST_CHAR.test(value)) return true;
  return FORMULA_PREFIX.test(value.replace(LEADING_WHITESPACE, ""));
}

/** Prefixes cells a spreadsheet would run as a formula, then quotes per RFC 4180. */
export function escapeCsvCell(value: string): string {
  const safe = startsLikeFormula(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildApplicationsCsv(docs: readonly Doc[]): string {
  const lines = [
    CSV_HEADERS.map(escapeCsvCell).join(","),
    ...docs.map((doc) => COLUMNS.map((column) => escapeCsvCell(column.value(doc))).join(",")),
  ];
  // BOM so Excel opens accented names (Zoë, Montréal) as UTF-8.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
