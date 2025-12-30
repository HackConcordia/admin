export interface IStats {
  totalApplicants: number;
  statusCounts: {
    Unverified: number;
    Submitted: number;
    Incomplete: number;
    Waitlisted: number;
    Admitted: number;
    Refused: number;
    Confirmed: number;
    Declined: number;
    "Checked-in": number;
  };
  newApplicantsLast24Hours: number;
  newApplicants24To48Hours: number;
  applicantsChange: number;
  weeklyApplicants: number;
  last7DaysApplicants: number[];
  topUniversities: {
    university: string;
    count: number;
  }[];
  tshirtCounts: {
    S: number;
    M: number;
    L: number;
    XL: number;
  };
  totalTeams: number;
  dietaryRestrictionsData: {
    restriction: string;
    count: number;
  }[];
  starredApplicantsCount: number;
  validApplicantsCount: number;
  starredPercentage: number;
  unassignedApplications: number;
}
