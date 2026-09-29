/** Maps an application document (lean or JSON) to what the detail view renders. Client-safe. */
import type { APPLICANT_FIELD_KEYS } from "@/lib/conuhacks/application-fields";

export type TeamMemberInfo = { userId: string; firstName: string; lastName: string; email: string };
export type TeamData = { teamId: string; teamName: string; members: TeamMemberInfo[] } | null;

export type ApplicationDetails = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  age: string;
  phoneNumber: string;
  country: string;
  city: string;
  communicationLanguage: string;
  languagesSpoken: string[];
  languagesSpokenOther: string;
  isStudentOrRecentGraduate: boolean;
  currentLevelOfSchooling: string;
  otherLevelOfSchooling: string;
  school: string;
  schoolOther: string;
  currentYear: string;
  degreeLength: string;
  degreeType: string;
  discipline: string;
  disciplineOther: string;
  hackathons: number | null;
  coolProject: string;
  excitedAbout: string;
  isRegisteredForCoop: boolean;
  jobRolesLookingFor: string;
  jobTypesInterested: string[];
  jobTypesInterestedOther: string;
  travelReimbursement: boolean | null;
  shirtSize: string;
  dietaryRestrictions: string[];
  dietaryRestrictionsDescription: string;
  gender: string;
  pronouns: string;
  underrepresented: string;
  github: string;
  linkedin: string;
  teamId?: string;
  processedBy?: string;
  processedAt?: string;
  hasResume: boolean;
  isTravelReimbursementApproved?: boolean;
  travelReimbursementAmount?: number;
  travelReimbursementCurrency?: string;
  comments?: string;
  skillTags?: string[];
  isStarred?: boolean;
};

// Compile-time check: every registry field is a key of ApplicationDetails (the view renders them by key).
type MissingRegistryKeys = Exclude<(typeof APPLICANT_FIELD_KEYS)[number], keyof ApplicationDetails>;
export const REGISTRY_KEYS_ARE_MAPPED: MissingRegistryKeys extends never ? true : never = true;

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
/** Kept in storage form (['["a"]']); a bare JSON string from older writes becomes a one-element array. */
const listStorage = (value: unknown): string[] => (typeof value === "string" ? (value ? [value] : []) : strings(value));
const booleanOrNull = (value: unknown): boolean | null => (typeof value === "boolean" ? value : null);
const countOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isInteger(value) ? value : null);

function isoDate(value: unknown): string | undefined {
  const date = value instanceof Date ? value : typeof value === "string" && value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
}

function hasStoredFile(file: unknown): boolean {
  if (typeof file !== "object" || file === null) return false;
  const id = (file as { id?: unknown }).id;
  return typeof id === "string" && id !== "";
}

export function toApplicationDetails(doc: Record<string, unknown>): ApplicationDetails {
  return {
    _id: String(doc._id),
    firstName: text(doc.firstName),
    lastName: text(doc.lastName),
    email: text(doc.email),
    status: text(doc.status),
    age: text(doc.age),
    phoneNumber: text(doc.phoneNumber),
    country: text(doc.country),
    city: text(doc.city),
    communicationLanguage: text(doc.communicationLanguage),
    languagesSpoken: listStorage(doc.languagesSpoken),
    languagesSpokenOther: text(doc.languagesSpokenOther),
    isStudentOrRecentGraduate: doc.isStudentOrRecentGraduate === true,
    currentLevelOfSchooling: text(doc.currentLevelOfSchooling),
    otherLevelOfSchooling: text(doc.otherLevelOfSchooling),
    school: text(doc.school),
    schoolOther: text(doc.schoolOther),
    currentYear: text(doc.currentYear),
    degreeLength: text(doc.degreeLength),
    degreeType: text(doc.degreeType),
    discipline: text(doc.discipline),
    disciplineOther: text(doc.disciplineOther),
    hackathons: countOrNull(doc.hackathons),
    coolProject: text(doc.coolProject),
    excitedAbout: text(doc.excitedAbout),
    isRegisteredForCoop: doc.isRegisteredForCoop === true,
    jobRolesLookingFor: text(doc.jobRolesLookingFor),
    jobTypesInterested: listStorage(doc.jobTypesInterested),
    jobTypesInterestedOther: text(doc.jobTypesInterestedOther),
    travelReimbursement: booleanOrNull(doc.travelReimbursement),
    shirtSize: text(doc.shirtSize),
    dietaryRestrictions: listStorage(doc.dietaryRestrictions),
    dietaryRestrictionsDescription: text(doc.dietaryRestrictionsDescription),
    gender: text(doc.gender),
    pronouns: text(doc.pronouns),
    underrepresented: text(doc.underrepresented),
    github: text(doc.github),
    linkedin: text(doc.linkedin),
    teamId: text(doc.teamId) || undefined,
    processedBy: text(doc.processedBy) || undefined,
    processedAt: isoDate(doc.processedAt),
    hasResume: hasStoredFile(doc.resume),
    isTravelReimbursementApproved: typeof doc.isTravelReimbursementApproved === "boolean" ? doc.isTravelReimbursementApproved : undefined,
    travelReimbursementAmount: typeof doc.travelReimbursementAmount === "number" ? doc.travelReimbursementAmount : undefined,
    travelReimbursementCurrency: text(doc.travelReimbursementCurrency) || undefined,
    comments: typeof doc.comments === "string" ? doc.comments : undefined,
    skillTags: Array.isArray(doc.skillTags) ? strings(doc.skillTags) : undefined,
    isStarred: doc.isStarred === true,
  };
}
