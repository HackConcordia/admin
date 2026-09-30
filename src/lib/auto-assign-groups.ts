export type UnassignedApplication = {
  _id: { toString(): string } | string;
  teamId?: string | null;
  travelReimbursement?: boolean | null;
};

export type AutoAssignGroups = {
  /** Groups an auto-assign may hand to a regular reviewer, keyed by teamId or `individual_<id>`. */
  assignable: Map<string, string[]>;
  heldGroups: number;
  heldApplications: number;
};

/**
 * Groups applications by team (an application without a team is its own group) and holds back
 * every group with at least one travel-reimbursement asker: those are assigned to a super admin by
 * hand, together with their whole team.
 */
export function groupForAutoAssign(applications: readonly UnassignedApplication[]): AutoAssignGroups {
  const groups = new Map<string, { ids: string[]; asksTravel: boolean }>();

  for (const app of applications) {
    const id = app._id.toString();
    const key = app.teamId || `individual_${id}`;
    const group = groups.get(key) ?? { ids: [], asksTravel: false };
    group.ids.push(id);
    if (app.travelReimbursement === true) group.asksTravel = true;
    groups.set(key, group);
  }

  const assignable = new Map<string, string[]>();
  let heldGroups = 0;
  let heldApplications = 0;
  for (const [key, group] of groups) {
    if (group.asksTravel) {
      heldGroups += 1;
      heldApplications += group.ids.length;
    } else {
      assignable.set(key, group.ids);
    }
  }
  return { assignable, heldGroups, heldApplications };
}
