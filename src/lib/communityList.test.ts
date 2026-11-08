import { describe, expect, it } from "vitest";
import { filterCommunityRowsByArea } from "./communityList";

describe("community panchayath filtering", () => {
  const rows = [
    { community_id: "one", creator_area_id: "north" },
    { community_id: "two", creator_area_id: "south" },
    { community_id: "three", creator_area_id: null },
  ];

  it("shows only communities whose creator belongs to the selected panchayath", () => {
    expect(filterCommunityRowsByArea(rows, "north").map((row) => row.community_id)).toEqual(["one"]);
  });

  it("keeps every community, including creators without an area, when all are selected", () => {
    expect(filterCommunityRowsByArea(rows, "all")).toEqual(rows);
  });
});