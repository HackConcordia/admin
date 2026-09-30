export interface IFile {
  id: string | null;
  originalName: string | null;
  encoding: string;
  size: number;
  mimetype: string;
}

export interface IApplicationData {
  _id: string;
  avatarSrc: string;
  firstName?: string;
  lastName?: string;
  processedBy?: string;
  name: string;
  email: string;
  status: string;
}

/** A ConUHacks XI application as stored (registration-website-conuhacks-10/my-app/lib/models/applicationSchema.ts). */
export interface IApplication {
  _id: string;
  firstName: string;
  lastName: string;
  age: string;
  phoneNumber: string;
  email: string;
  country: string;
  city: string;
  communicationLanguage: string;
  /** ['["english","french"]'] */
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
  /** 0–5 (5 = "5 or more"); null = not answered. */
  hackathons: number | null;
  coolProject: string;
  excitedAbout: string;
  /** null = not answered. */
  travelReimbursement: boolean | null;
  shirtSize: string;
  dietaryRestrictions: string[];
  dietaryRestrictionsDescription: string;
  resume: IFile | null;
  github: string | null;
  linkedin: string | null;
  gender: string | null;
  pronouns: string | null;
  underrepresented: string;
  isRegisteredForCoop: boolean;
  jobRolesLookingFor: string;
  jobTypesInterested: string[];
  jobTypesInterestedOther: string;
  termsAndConditions: { mlhConduct: boolean; mlhEmails: boolean; mlhTerms: boolean };
  status: string;
  teamId: string;
  processedBy?: string;
  isTravelReimbursementApproved?: boolean;
  travelReimbursementAmount?: number;
  travelReimbursementCurrency?: string;
  comments?: string;
  skillTags?: string[];
  isStarred?: boolean;
}
