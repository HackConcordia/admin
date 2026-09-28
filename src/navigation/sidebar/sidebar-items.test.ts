import { describe, expect, it } from "vitest";

import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

const items = sidebarItems[0].items;
const titles = items.map((item) => item.title);

describe("sidebar items", () => {
  it("places Volunteers directly above Account", () => {
    const volunteersIndex = titles.indexOf("Volunteers");

    expect(volunteersIndex).toBeGreaterThan(-1);
    expect(titles[volunteersIndex + 1]).toBe("Account");
  });

  it("shows Volunteers to super admins only", () => {
    expect(items.find((item) => item.title === "Volunteers")).toMatchObject({
      url: "/dashboard/volunteers",
      superAdminOnly: true,
    });
  });
});
