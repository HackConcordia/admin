export interface NameCount {
  name: string;
  count: number;
}

export interface IAdvancedStats {
  /** False for a regular reviewer: gender and age are then empty (super-admin-only fields). */
  sensitiveVisible: boolean;
  totalApplicants: number;
  overallTravelReimbursement: number;
  confirmedTravelReimbursement: number;
  travelReimbursement: {
    requested: number;
    requestedOutsideQuebec: number;
    requestedFromQuebec: number;
    notRequested: number;
    unanswered: number;
  };
  studentOrRecentGraduate: number;
  levelOfSchoolingDistribution: NameCount[];
  currentYearDistribution: NameCount[];
  degreeLengthDistribution: NameCount[];
  disciplineDistribution: NameCount[];
  communicationLanguageDistribution: NameCount[];
  languagesSpokenDistribution: NameCount[];
  hackathonsDistribution: NameCount[];
  genderDistribution: NameCount[];
  countryDistribution: { code: string; count: number }[];
  coopStats: { registered: number; notRegistered: number };
  jobTypesDistribution: NameCount[];
  adminAssignmentMetrics: { adminName: string; email: string; totalAssigned: number; submittedAssigned: number }[];
  /** Confirmed and checked-in applicants only. */
  ageDistribution: { eighteenOrAbove: number; underEighteen: number; notAnswered: number; buckets: NameCount[] };
}
