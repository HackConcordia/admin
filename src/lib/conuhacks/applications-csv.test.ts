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

const CRLF = "\r\n";

// Splits one CSV line on the commas outside double quotes (city labels like "Montréal, Quebec" are quoted).
const cells = (line: string): string[] => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

describe("buildApplicationsCsv", () => {
  const csv = buildApplicationsCsv([
    {
      _id: "64c000000000000000000001", firstName: "Zoë", lastName: "Łukasz", email: "z@x.dev", status: "CheckedIn",
      age: "under-18", country: "CA", city: "Montreal", languagesSpoken: ['["english","other"]'], languagesSpokenOther: "Arabic",
      discipline: "other", disciplineOther: "Bio", hackathons: 5, travelReimbursement: null, dietaryRestrictions: ["[]"],
      jobTypesInterested: '["other"]', jobTypesInterestedOther: "Robotics", coolProject: "=cmd|' /C calc'!A0",
      termsAndConditions: { mlhConduct: true, mlhTerms: true, mlhEmails: false },
      processedAt: new Date("2026-10-01T12:00:00.000Z"), checkedInAt: "2027-02-06T15:30:00.000Z",
      currentLevelOfSchooling: "Undergraduate", currentYear: "Year 2", degreeType: "Bachelor's", underrepresented: "Unsure",
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

  it("adds the MLH consents and the processed and check-in timestamps", () => {
    expect(CSV_HEADERS).toEqual(
      expect.arrayContaining(["MLH code of conduct", "MLH terms and privacy policy", "MLH emails", "Processed at", "Checked in at"]),
    );
    const cell = (name: string) => cells(row)[CSV_HEADERS.indexOf(name)];
    expect(cell("MLH code of conduct")).toBe("yes");
    expect(cell("MLH terms and privacy policy")).toBe("yes");
    expect(cell("MLH emails")).toBe("no");
    expect(cell("Processed at")).toBe("2026-10-01T12:00:00.000Z");
    expect(cell("Checked in at")).toBe("2027-02-06T15:30:00.000Z");
  });

  it("leaves the consents blank when nothing was recorded, and never treats a missing one as yes", () => {
    const [, blank] = buildApplicationsCsv([{ firstName: "A" }]).replace(/^\uFEFF/, "").trimEnd().split(CRLF);
    const blankCells = cells(blank);
    expect(blankCells[CSV_HEADERS.indexOf("MLH emails")]).toBe("");
    expect(blankCells[CSV_HEADERS.indexOf("Processed at")]).toBe("");
  });

  it("writes the option labels for underrepresented, degree type and current year, and keeps an unlisted value", () => {
    const cell = (name: string) => cells(row)[CSV_HEADERS.indexOf(name)];
    expect(cell("Underrepresented")).toBe("Unsure");
    expect(cell("Degree type")).toBe("Bachelor's");
    expect(cell("Current year")).toBe("Year 2");
    const [, odd] = buildApplicationsCsv([{ currentLevelOfSchooling: "Undergraduate", currentYear: "Year 9", underrepresented: "Maybe" }])
      .replace(/^\uFEFF/, "").trimEnd().split(CRLF);
    expect(cells(odd)[CSV_HEADERS.indexOf("Current year")]).toBe("Year 9");
    expect(cells(odd)[CSV_HEADERS.indexOf("Underrepresented")]).toBe("Maybe");
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
