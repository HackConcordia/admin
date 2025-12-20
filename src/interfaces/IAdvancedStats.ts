export interface IAdvancedStats {
  totalApplicants: number;
  ageEligibility: {
    yes: number;
    no: number;
    notSpecified: number;
  };
  facultyDistribution: {
    name: string;
    count: number;
  }[];
  levelOfStudyDistribution: {
    name: string;
    count: number;
  }[];
  programDistribution: {
    name: string;
    count: number;
  }[];
  graduationYearDistribution: {
    year: string;
    count: number;
  }[];
  travelReimbursement: {
    needed: number;
    notNeeded: number;
  };
  preferredLanguageDistribution: {
    name: string;
    count: number;
  }[];
  genderDistribution: {
    name: string;
    count: number;
  }[];
  countryDistribution: {
    code: string;
    count: number;
  }[];
  coopStats: {
    registered: number;
    notRegistered: number;
  };
  jobTypesDistribution: {
    name: string;
    count: number;
  }[];
  workRegionsDistribution: {
    name: string;
    count: number;
  }[];
}
