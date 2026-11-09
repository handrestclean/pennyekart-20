import { describe, expect, it } from "vitest";
import { filterAndSortCommunities } from "@/lib/communityList";

const rows = [
  { id: "orders", creator_local_body_id: "p1", order_count: 8, profit: 40, member_count: 3 },
  { id: "profit", creator_local_body_id: "p1", order_count: 5, profit: 90, member_count: 7 },
  { id: "members", creator_local_body_id: "p2", order_count: 5, profit: 20, member_count: 12 },
  { id: "unset", creator_local_body_id: null, order_count: 1, profit: 5, member_count: 1 },
];

describe("filterAndSortCommunities", () => {
  it("filters communities by creator Panchayath and supports profiles without an area", () => {
    expect(filterAndSortCommunities(rows, "p1", "top").map((row) => row.id)).toEqual(["orders", "profit"]);
    expect(filterAndSortCommunities(rows, "not_set", "top").map((row) => row.id)).toEqual(["unset"]);
  });

  it("sorts by orders, profit, members, and a combined top-performing order", () => {
    expect(filterAndSortCommunities(rows, "all", "orders")[0]?.id).toBe("orders");
    expect(filterAndSortCommunities(rows, "all", "profit")[0]?.id).toBe("profit");
    expect(filterAndSortCommunities(rows, "all", "members")[0]?.id).toBe("members");
    expect(filterAndSortCommunities(rows, "all", "top")[0]?.id).toBe("orders");
  });
});