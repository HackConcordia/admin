import { describe, expect, it, vi } from "vitest";

import { createFindByIdMock } from "@/test/admin-lookup";

const applicationModel = vi.hoisted(() => ({ find: vi.fn() }));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/admin", () => ({ default: { findById: createFindByIdMock() } }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));

import * as exportCsv from "@/app/api/(group)/applications/export-csv/route";
import { csvStatusQuery } from "@/lib/conuhacks/applications-csv";
import { runGuardCases } from "@/test/guard-cases";
import { adminCookie, buildRequest } from "@/test/http";

runGuardCases([
  { name: "GET /api/applications/export-csv", handler: exportCsv.GET, method: "GET", url: "/api/applications/export-csv", level: "super" },
]);

function mockApplications(docs: unknown[]) {
  const lean = vi.fn().mockResolvedValue(docs);
  const sort = vi.fn(() => ({ lean }));
  const select = vi.fn(() => ({ sort }));
  applicationModel.find.mockReturnValue({ select });
}

describe("GET /api/applications/export-csv", () => {
  it("rejects an unknown status filter", async () => {
    const res = await exportCsv.GET(buildRequest("/api/applications/export-csv?status=refused", { cookie: await adminCookie() }));
    expect(res.status).toBe(400);
    expect(applicationModel.find).not.toHaveBeenCalled();
  });

  it("downloads confirmed and checked-in applicants as a UTF-8 CSV", async () => {
    mockApplications([{ _id: "64c000000000000000000001", firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", status: "CheckedIn", age: "19" }]);

    const res = await exportCsv.GET(buildRequest("/api/applications/export-csv?status=confirmed", { cookie: await adminCookie() }));

    expect(res.status).toBe(200);
    expect(applicationModel.find).toHaveBeenCalledWith({ status: { $in: ["Confirmed", "Checked-in", "CheckedIn"] } });
    expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="conuhacks-xi-applications-confirmed.csv"');
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    expect(body).toContain("Application ID,First name,Last name,Email,Status,Age");
    expect(body).toContain("64c000000000000000000001,Ada,Lovelace,ada@example.com,Checked-in,19");
  });

  it("exports the travel list outside Quebec", async () => {
    mockApplications([]);
    const res = await exportCsv.GET(
      buildRequest("/api/applications/export-csv?status=travel-outside-quebec", { cookie: await adminCookie() }),
    );
    expect(res.status).toBe(200);
    expect(applicationModel.find.mock.calls[0][0]).toEqual(csvStatusQuery("travel-outside-quebec"));
  });

  it("logs only the error name when the query fails", async () => {
    applicationModel.find.mockImplementation(() => {
      throw new TypeError("secret detail ada@example.com");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await exportCsv.GET(buildRequest("/api/applications/export-csv", { cookie: await adminCookie() }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret detail");
    log.mockRestore();
  });
});
