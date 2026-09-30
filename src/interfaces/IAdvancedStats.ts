export interface NameCount {
  name: string;
  count: number;
}

export interface IAdvancedStats {
  /** False for a regular reviewer: gender and age are then empty and the approved travel totals are null. */
  sensitiveVisible: boolean;
  totalApplicants: number;
  /** Approved reimbursements in CAD. Travel decisions are super-admin-only (A2), so null for a regular reviewer. */
  overallTravelReimbursement: number | null;
  confirmedTravelReimbursement: number | null;
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
