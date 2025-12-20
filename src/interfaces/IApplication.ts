export interface IFile {
  id: string;
  originalName: string;
  encoding: string;
  size: number;
  mimetype: string;
  url: string;
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
  isEighteenOrAbove: string;
  phoneNumber: string;
  email: string;
  country: string;
  city: string;
  school: string;
  schoolOther: string;
  faculty: string;
  facultyOther: string;
  levelOfStudy: string;
  levelOfStudyOther: string;
  program: string;
  programOther: string;
  graduationSemester: string;
  graduationYear: string;
  coolProject: string;
  excitedAbout: string;
  travelReimbursement: boolean;
  preferredLanguage: string;
  workingLanguages: string;
  workingLanguagesOther: string;
  shirtSize: string;
  dietaryRestrictions: string;
  dietaryRestrictionsDescription: string;
  resume: IFile | null;
  github: string;
  linkedin: string;
  gender: string;
  pronouns: string;
  underrepresented: string;
  jobRolesLookingFor: string;
  workRegions: string;
  workRegionsOther: string;
  jobTypesInterested: string;
  jobTypesInterestedOther: string;
  isRegisteredForCoop: boolean;
  nextCoopTerm: string;
  nextCoopTermOther: string;
  termsAndConditions: {
    mlhConduct: boolean;
    mlhEmails: boolean;
    mlhTerms: boolean;
  };
  status: string;
  teamId: string;
  isTravelReimbursementApproved?: boolean;
  travelReimbursementAmount?: number;
  travelReimbursementCurrency?: string;
}
