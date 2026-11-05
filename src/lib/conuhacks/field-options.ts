/**
 * ConUHacks XI option VALUES (what is stored). Labels (EN/FR) live in public/data/*.tsx. Kept
 * model- and React-free so the schema, the server rules, the form and the tests share one source.
 * Proposed lists: see the plan's open question Q4 before registration opens.
 */
export const COMMUNICATION_LANGUAGES = ["english", "french"] as const;
export const LANGUAGES_SPOKEN = ["english", "french", "other"] as const;
export const SCHOOLING_LEVELS = ["High School", "CEGEP", "Undergraduate", "Graduate", "Recent graduate", "Other"] as const;
export type SchoolingLevel = (typeof SCHOOLING_LEVELS)[number];
export const DISCIPLINES = [
  "computer-science",
  "software-engineering",
  "computer-engineering",
  "electrical-engineering",
  "mechanical-engineering",
  "other-engineering",
  "mathematics-statistics",
  "data-science",
  "business",
  "design-fine-arts",
  "natural-sciences",
  "social-sciences-humanities",
  "other",
] as const;
/** Hackathons attended: 0–5, where 5 means "5 or more". */
export const MAX_HACKATHON_COUNT = 5;
/** Longest free-text "current year" (level "Other"); the form and the server share it. */
export const MAX_FREE_YEAR_LENGTH = 200;

/** Levels whose current year is picked from a list (level "Other" types it). */
type ListedYearLevel = Exclude<SchoolingLevel, "Other">;
/** Levels that are also asked for a degree length and type (high school is not). */
type DegreeLevel = Exclude<ListedYearLevel, "High School">;

const CURRENT_YEARS: Record<ListedYearLevel, readonly string[]> = {
  "High School": ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
  CEGEP: ["Year 1", "Year 2", "Year 3", "Year 4+"],
  Undergraduate: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5+"],
  Graduate: ["Master's – year 1", "Master's – year 2+", "PhD – year 1-2", "PhD – year 3+"],
  // "Graduated within the last year" relative to ConUHacks XI (Feb 6–7, 2027).
  "Recent graduate": ["Winter 2026", "Summer 2026", "Fall 2026"],
};

const UNIVERSITY_DEGREE_LENGTHS = ["1 year", "2 years", "3 years", "4 years", "5+ years"] as const;

const DEGREE_LENGTHS: Record<DegreeLevel, readonly string[]> = {
  CEGEP: ["1 year", "2 years", "3 years", "Other"],
  Undergraduate: UNIVERSITY_DEGREE_LENGTHS,
  Graduate: UNIVERSITY_DEGREE_LENGTHS,
  "Recent graduate": UNIVERSITY_DEGREE_LENGTHS,
};

const DEGREE_TYPES: Record<DegreeLevel, readonly string[]> = {
  CEGEP: ["DEC", "AEC", "Certificate", "Technical", "Other"],
  Undergraduate: ["Bachelor's", "Certificate", "Diploma", "Other"],
  Graduate: ["Master's (thesis)", "Master's (course-based)", "PhD", "Graduate certificate / diploma", "Other"],
  "Recent graduate": ["DEC", "AEC", "Bachelor's", "Master's", "PhD", "Certificate / diploma", "Other"],
};

export const isSchoolingLevel = (value: unknown): value is SchoolingLevel =>
  typeof value === "string" && (SCHOOLING_LEVELS as readonly string[]).includes(value);

const isListedYearLevel = (value: unknown): value is ListedYearLevel => isSchoolingLevel(value) && value !== "Other";

const isDegreeLevel = (value: unknown): value is DegreeLevel => isListedYearLevel(value) && value !== "High School";

export const isOtherLevel = (level: unknown): boolean => level === "Other";

/** Degree length and type are asked for every level except "High School" and "Other". */
export const requiresDegreeDetails = (level: unknown): boolean => isDegreeLevel(level);

/** The "current year" choices for a level, or null when the applicant types it (level "Other" or none). */
export function currentYearValues(level: unknown): readonly string[] | null {
  return isListedYearLevel(level) ? CURRENT_YEARS[level] : null;
}

/** The degree-length choices for a level (CEGEP has its own), or none when degree details are not asked. */
export function degreeLengthValues(level: unknown): readonly string[] {
  return isDegreeLevel(level) ? DEGREE_LENGTHS[level] : [];
}

export function degreeTypeValues(level: unknown): readonly string[] {
  return isDegreeLevel(level) ? DEGREE_TYPES[level] : [];
}
