import { describe, expect, it } from "vitest";

import { buildApplicationsQuery, travelFilterClause } from "@/lib/conuhacks/application-query";
import { QUEBEC_CITIES } from "@/lib/conuhacks/quebec";

describe("travelFilterClause", () => {
  it("lists requests from outside Quebec: another country, or a Canadian city that isn't in Quebec", () => {
    expect(travelFilterClause("outside-quebec")).toEqual({
      travelReimbursement: true,
      $or: [{ country: { $ne: "CA" } }, { country: "CA", city: { $nin: [...QUEBEC_CITIES] } }],
    });
    expect(QUEBEC_CITIES).toContain("other-quebec");
  });

  it("separates 'said no' from 'not answered' (null or missing)", () => {
    expect(travelFilterClause("false")).toEqual({ travelReimbursement: false });
    expect(travelFilterClause("unanswered")).toEqual({ travelReimbursement: null });
  });

  it("ignores unknown values", () => {
    expect(travelFilterClause("everything")).toBeNull();
  });
});

describe("buildApplicationsQuery", () => {
  it("keeps the search when the outside-Quebec filter is also on (both used to write $or)", () => {
    const query = buildApplicationsQuery({ search: "ada", travelReimbursement: "outside-quebec" });
    expect(query.$and).toHaveLength(2);
    expect(JSON.stringify(query)).toContain("ada");
    expect(JSON.stringify(query)).toContain("$nin");
  });

  it("ignores the approved-travel filter unless the caller is a super admin", () => {
    const reviewer = buildApplicationsQuery({ travelReimbursement: "approved", assignedIds: ["1"], isSuperAdmin: false });
    expect(JSON.stringify(reviewer)).not.toContain("isTravelReimbursementApproved");
    expect(reviewer).toEqual({ _id: { $in: ["1"] } });
    expect(JSON.stringify(buildApplicationsQuery({ travelReimbursement: "approved" }))).not.toContain("isTravelReimbursementApproved");
    expect(buildApplicationsQuery({ travelReimbursement: "approved", isSuperAdmin: true })).toEqual({ isTravelReimbursementApproved: true });
  });

  it("escapes regex characters in the search", () => {
    expect(JSON.stringify(buildApplicationsQuery({ search: "a.b(" }))).toContain("a\\\\.b\\\\(");
  });

  it("returns a single clause unwrapped, and nothing for no filters", () => {
    expect(buildApplicationsQuery({ status: "Submitted" })).toEqual({ status: "Submitted" });
    expect(buildApplicationsQuery({})).toEqual({});
  });

  it("matches both checked-in spellings, the reviewer and the assigned ids together", () => {
    expect(buildApplicationsQuery({ status: "Checked-in", assignedTo: "a@x.dev", assignedIds: ["1"] })).toEqual({
      $and: [
        { status: { $in: ["Checked-in", "CheckedIn"] } },
        { processedBy: { $in: ["a@x.dev"] } },
        { _id: { $in: ["1"] } },
      ],
    });
  });
});
