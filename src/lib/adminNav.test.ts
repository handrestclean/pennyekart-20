import { describe, it, expect } from "vitest";
import { ADMIN_NAV_GROUPS, ALL_ADMIN_NAV_ITEMS, searchAdminNavGroups, visibleAdminNavGroups } from "./adminNav";

describe("admin navigation", () => {
  it("has 10 categories and keeps every existing page", () => {
    expect(ADMIN_NAV_GROUPS).toHaveLength(10);
    expect(ALL_ADMIN_NAV_ITEMS).toHaveLength(31);
    expect(new Set(ALL_ADMIN_NAV_ITEMS.map((i) => i.path)).size).toBe(31);
  });

  it("hides super-admin-only pages and empty categories for limited admins", () => {
    const groups = visibleAdminNavGroups(ADMIN_NAV_GROUPS, (p) => p === "read_orders", false);
    expect(groups.map((g) => g.id)).toEqual(["overview", "sales"]);
    expect(groups[1].items.map((i) => i.path)).toEqual(["/admin/orders"]);
  });

  it("searches item names and category names", () => {
    expect(searchAdminNavGroups(ADMIN_NAV_GROUPS, "push").flatMap((g) => g.items.map((i) => i.path))).toEqual(["/admin/push-notifications"]);
    expect(searchAdminNavGroups(ADMIN_NAV_GROUPS, "finance")[0].items).toHaveLength(2);
  });
});
