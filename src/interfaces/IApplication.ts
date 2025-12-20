export interface IFile {
  id: string; // File ID
  originalName: string;
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

export interface IApplication {
  _id: string;
  firstName: string;
  lastName: string;
  age: string;
  isEighteenOrAbove?: string;
  phoneNumber?: string;
  status: string;
  email: string;
  processedBy?: string;
  processedAt?: Date | null;
  teamId: string | undefined;
  isFromMontreal?: boolean;
  country?: string;
  city?: string | undefined;
  school?: string;
  schoolOther?: string;
  discipline?: string;
  faculty?: string;
  facultyOther?: string;
  levelOfStudy?: string;
  levelOfStudyOther?: string;
  program?: string;
  programOther?: string;
  graduationSemester?: string;
  graduationYear?: string;
  coolProject?: string;
  excitedAbout?: string;
  travelReimbursement?: boolean;
  preferredLanguage?: string;
  workingLanguages?: string[];
  workingLanguagesOther?: string;
  shirtSize?: string;
  dietaryRestrictions?: string[];
  dietaryRestrictionsDescription?: string;
  resume?: IFile | null;
  hackathons?: number;
  github?: string | undefined;
  linkedin?: string | undefined;
  gender?: string;
  pronouns?: string;
  underrepresented?: string;
  jobRolesLookingFor?: string;
  workRegions?: string[];
  workRegionsOther?: string;
  jobTypesInterested?: string[];
  jobTypesInterestedOther?: string;
  isRegisteredForCoop?: boolean;
  nextCoopTerm?: string;
  nextCoopTermOther?: string;
  termsAndConditions: {
    mlhConduct: boolean;
    mlhEmails: boolean;
    mlhTerms: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
