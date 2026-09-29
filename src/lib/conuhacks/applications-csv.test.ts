import { describe, expect, it } from "vitest";

import { CSV_HEADERS, buildApplicationsCsv, csvStatusQuery, escapeCsvCell, isCsvStatusFilter } from "@/lib/conuhacks/applications-csv";

describe("escapeCsvCell", () => {
  it.each([
    ['=HYPERLINK("x")', '"\'=HYPERLINK(""x"")"'],
    ["  +1", "'  +1"],
    ["-2", "'-2"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\t=1", "'\t=1"],
    ["plain", "plain"],
    ["a,b", '"a,b"'],
    ["line\nbreak", '"line\nbreak"'],
  ])("%j gives %j", (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });
});

describe("buildApplicationsCsv", () => {
  const csv = buildApplicationsCsv([
    {
      _id: "64c000000000000000000001", firstName: "Zoë", lastName: "Łukasz", email: "z@x.dev", status: "CheckedIn",
      age: "under-18", country: "CA", city: "Montreal", languagesSpoken: ['["english","other"]'], languagesSpokenOther: "Arabic",
      discipline: "other", disciplineOther: "Bio", hackathons: 5, travelReimbursement: null, dietaryRestrictions: ["[]"],
      jobTypesInterested: '["other"]', jobTypesInterestedOther: "Robotics", coolProject: "=cmd|' /C calc'!A0",
    },
  ]);
  const [header, row] = csv.replace(/^\uFEFF/, "").trimEnd().split("\r\n");

  it("starts with a BOM and uses CRLF line endings", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("has one header per column, covering the XI fields", () => {
    expect(header.split(",")).toEqual([...CSV_HEADERS]);
    expect(CSV_HEADERS).toEqual(
      expect.arrayContaining(["Age", "Discipline", "Languages spoken", "Hackathons", "Travel requested", "Quebec resident", "Travel approved"]),
    );
  });

  it("writes labels, keeps accented names and neutralizes formulas", () => {
    for (const expected of ["Zoë", "Łukasz", "Checked-in", "Under 18", "English | Other (Arabic)", "Other (Bio)", "5+", "Not answered",
      "Other (Robotics)", ",yes,", "'=cmd|' /C calc'!A0"]) {
      expect(row).toContain(expected);
    }
  });

  it("keeps characters outside Latin-1", () => {
    expect(buildApplicationsCsv([{ firstName: "王", lastName: "Łukasz" }])).toContain("王,Łukasz");
  });
});

describe("csvStatusQuery", () => {
  it("lists submitted travel requests from outside Quebec, and rejects unknown filters", () => {
    expect(JSON.stringify(csvStatusQuery("travel-outside-quebec"))).toContain('"$nin":["Unverified","Incomplete"]');
    expect(JSON.stringify(csvStatusQuery("travel-outside-quebec"))).toContain('"travelReimbursement":true');
    expect(isCsvStatusFilter("everything")).toBe(false);
  });
});
