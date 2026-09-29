/** Advanced analytics for ConUHacks XI applications (every submitted application). Pure. */
import { Countries } from "@/constants/Countries";
import { DegreeLengths } from "@/constants/DegreeLengths";
import { Disciplines } from "@/constants/Disciplines";
import { Genders } from "@/constants/Genders";
import { JobTypes } from "@/constants/JobTypes";
import { LanguagesSpoken } from "@/constants/LanguagesSpoken";
import { SchoolingLevels } from "@/constants/SchoolingLevels";
import type { IAdvancedStats, NameCount } from "@/interfaces/IAdvancedStats";
import { formatAge, formatCommunicationLanguage, formatHackathons, optionLabel, type Option } from "@/lib/conuhacks/display";
import { AGE_VALUES, MAX_HACKATHON_COUNT } from "@/lib/conuhacks/field-options";
import { parseListField } from "@/lib/conuhacks/list-field";
import { isQuebecResident } from "@/lib/conuhacks/quebec";
import { isCheckedInStatus } from "@/lib/status";

export const ADVANCED_STATS_FIELDS =
  "status age country city communicationLanguage languagesSpoken isStudentOrRecentGraduate currentLevelOfSchooling " +
  "currentYear degreeLength discipline hackathons travelReimbursement isTravelReimbursementApproved " +
  "travelReimbursementAmount travelReimbursementCurrency gender isRegisteredForCoop jobTypesInterested";

/** CAD per USD for the reimbursement totals (ConUHacks X's rate). */
export const USD_TO_CAD = 1.39;

const UNDER_18 = "under-18";
const NOT_SPECIFIED = "Not specified";

type App = Record<string, unknown>;

export interface AdvancedStatsAdmin {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  assignedApplications?: unknown;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const orNotSpecified = (value: string): string => value || NOT_SPECIFIED;
const isAttending = (app: App): boolean => app.status === "Confirmed" || isCheckedInStatus(app.status);
const isAdmittedOrAttending = (app: App): boolean => app.status === "Admitted" || isAttending(app);
const roundCents = (value: number): number => Math.round(value * 100) / 100;

/** Counts values, most frequent first, ties alphabetical. */
export function countBy(values: readonly string[]): NameCount[] {
  const counts = values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>());
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function reimbursementCad(app: App): number {
  if (app.isTravelReimbursementApproved !== true) return 0;
  const amount = typeof app.travelReimbursementAmount === "number" ? app.travelReimbursementAmount : 0;
  return app.travelReimbursementCurrency === "USD" ? amount * USD_TO_CAD : amount;
}

const totalCad = (apps: readonly App[]): number => roundCents(apps.reduce((sum, app) => sum + reimbursementCad(app), 0));

function travelRequests(apps: readonly App[]): IAdvancedStats["travelReimbursement"] {
  const requested = apps.filter((app) => app.travelReimbursement === true);
  const fromQuebec = requested.filter((app) => isQuebecResident(app.country, app.city)).length;
  return {
    requested: requested.length,
    requestedOutsideQuebec: requested.length - fromQuebec,
    requestedFromQuebec: fromQuebec,
    notRequested: apps.filter((app) => app.travelReimbursement === false).length,
    unanswered: apps.filter((app) => typeof app.travelReimbursement !== "boolean").length,
  };
}

function ageDistribution(apps: readonly App[]): IAdvancedStats["ageDistribution"] {
  const attending = apps.filter(isAttending);
  const known = new Set<string>(AGE_VALUES);
  const hasBucket = (app: App): boolean => typeof app.age === "string" && known.has(app.age);
  return {
    underEighteen: attending.filter((app) => app.age === UNDER_18).length,
    eighteenOrAbove: attending.filter((app) => hasBucket(app) && app.age !== UNDER_18).length,
    notAnswered: attending.filter((app) => !hasBucket(app)).length,
    buckets: AGE_VALUES.map((value) => ({ name: formatAge(value), count: attending.filter((app) => app.age === value).length })),
  };
}

function hackathonsDistribution(apps: readonly App[]): NameCount[] {
  const labels = apps.map((app) => formatHackathons(app.hackathons));
  const order = [...Array.from({ length: MAX_HACKATHON_COUNT + 1 }, (_, count) => formatHackathons(count)), ""];
  return order.map((label) => ({ name: label || NOT_SPECIFIED, count: labels.filter((entry) => entry === label).length }));
}

const listLabels = (apps: readonly App[], key: string, options: readonly Option[]): string[] =>
  apps.flatMap((app) =>
    parseListField(app[key])
      .filter((value) => value !== "" && value.toLowerCase() !== "none")
      .map((value) => optionLabel(options, value)),
  );

const labelled = (apps: readonly App[], key: string, options: readonly Option[]): NameCount[] =>
  countBy(apps.map((app) => orNotSpecified(optionLabel(options, app[key]))));

export function computeAdvancedStats(applications: readonly App[], admins: readonly AdvancedStatsAdmin[]): IAdvancedStats {
  const statusById = new Map(applications.map((app): [string, unknown] => [String(app._id), app.status]));
  const coop = applications.filter((app) => app.isRegisteredForCoop === true).length;

  return {
    sensitiveVisible: true,
    totalApplicants: applications.length,
    overallTravelReimbursement: totalCad(applications.filter(isAdmittedOrAttending)),
    confirmedTravelReimbursement: totalCad(applications.filter(isAttending)),
    travelReimbursement: travelRequests(applications),
    studentOrRecentGraduate: applications.filter((app) => app.isStudentOrRecentGraduate === true).length,
    levelOfSchoolingDistribution: labelled(applications, "currentLevelOfSchooling", SchoolingLevels("en")),
    currentYearDistribution: countBy(applications.map((app) => orNotSpecified(text(app.currentYear)))),
    degreeLengthDistribution: countBy(
      applications.filter((app) => text(app.degreeLength)).map((app) => optionLabel(DegreeLengths("en"), app.degreeLength)),
    ),
    // Grouped by the listed value ("Other" stays one bar); the typed text is in the CSV.
    disciplineDistribution: labelled(applications, "discipline", Disciplines("en")),
    communicationLanguageDistribution: countBy(
      applications.map((app) => orNotSpecified(formatCommunicationLanguage(app.communicationLanguage))),
    ),
    languagesSpokenDistribution: countBy(listLabels(applications, "languagesSpoken", LanguagesSpoken("en"))),
    hackathonsDistribution: hackathonsDistribution(applications),
    genderDistribution: labelled(applications, "gender", Genders("en")),
    countryDistribution: labelled(applications, "country", Countries("en"))
      .slice(0, 10)
      .map(({ name, count }) => ({ code: name, count })),
    coopStats: { registered: coop, notRegistered: applications.length - coop },
    jobTypesDistribution: countBy(listLabels(applications, "jobTypesInterested", JobTypes("en"))),
    adminAssignmentMetrics: admins
      .map((admin) => {
        const assigned = Array.isArray(admin.assignedApplications) ? admin.assignedApplications.map(String) : [];
        return {
          adminName: `${text(admin.firstName)} ${text(admin.lastName)}`.trim(),
          email: text(admin.email),
          totalAssigned: assigned.length,
          submittedAssigned: assigned.filter((id) => statusById.get(id) === "Submitted").length,
        };
      })
      .filter((metric) => metric.totalAssigned > 0),
    ageDistribution: ageDistribution(applications),
  };
}

/**
 * Empties the breakdowns of super-admin-only fields (gender, age; SUPER_ADMIN_ONLY_FIELD_KEYS) for a
 * caller who is not a DB-verified super admin. Empty, not zeroed, because an off-list gender becomes
 * its own label (applicant text).
 */
export function redactSensitiveAdvancedStats(stats: IAdvancedStats, isSuperAdmin: boolean): IAdvancedStats {
  if (isSuperAdmin) return stats;
  return {
    ...stats,
    sensitiveVisible: false,
    genderDistribution: [],
    ageDistribution: { eighteenOrAbove: 0, underEighteen: 0, notAnswered: 0, buckets: [] },
  };
}
