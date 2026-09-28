import { describe, expect, it, vi } from "vitest";

const applicationModel = vi.hoisted(() => ({ findById: vi.fn(), findByIdAndUpdate: vi.fn() }));
const emails = vi.hoisted(() => ({
  sendAdmittedEmail: vi.fn(async () => true),
  sendWaitlistedEmail: vi.fn(async () => true),
  sendRefusedEmail: vi.fn(async () => true),
  sendDiscordLink: vi.fn(async () => true),
}));

vi.mock("@/repository/mongoose", () => ({ default: vi.fn() }));
vi.mock("@/repository/models/application", () => ({ default: applicationModel }));
vi.mock("@/utils/admissionEmailConfig", () => emails);

import * as status from "@/app/api/(group)/status/[applicationId]/route";
import { runGuardCases } from "@/test/guard-cases";
import { TEST_ADMIN_EMAIL, adminCookie, buildRequest, routeContext } from "@/test/http";

const APP_ID = "64c000000000000000000001";

runGuardCases([
  { name: "PATCH /api/status/[id]", handler: status.PATCH, method: "PATCH", url: `/api/status/${APP_ID}`, level: "any", params: { applicationId: APP_ID } },
]);

describe("PATCH /api/status/[applicationId]", () => {
  it("records the logged-in admin as processedBy, ignoring the body", async () => {
    applicationModel.findById.mockResolvedValue({ _id: APP_ID, email: "hacker@test.dev", firstName: "H", lastName: "K" });
    applicationModel.findByIdAndUpdate.mockResolvedValue({});

    const res = await status.PATCH(
      buildRequest(`/api/status/${APP_ID}`, {
        method: "PATCH",
        cookie: await adminCookie(),
        body: { action: "waitlist", adminEmail: "attacker@evil.dev" },
      }),
      routeContext({ applicationId: APP_ID }),
    );

    expect(res.status).toBe(200);
    expect(applicationModel.findByIdAndUpdate).toHaveBeenCalledWith(
      APP_ID,
      expect.objectContaining({ processedBy: TEST_ADMIN_EMAIL, status: "Waitlisted" }),
      { new: true },
    );
    expect(emails.sendWaitlistedEmail).toHaveBeenCalledWith("hacker@test.dev", "H", "K");
  });
});
