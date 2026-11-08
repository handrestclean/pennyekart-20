import { describe, expect, it } from "vitest";
import { fetchAllRowsInBatches, USER_DATA_BATCH_SIZE } from "./fetchAllRowsInBatches";

describe("fetchAllRowsInBatches", () => {
  it("fetches every row beyond the 1,000-row response limit", async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => index);
    const ranges: Array<[number, number]> = [];

    const result = await fetchAllRowsInBatches(async (from, to) => {
      ranges.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    });

    expect(USER_DATA_BATCH_SIZE).toBe(1000);
    expect(result).toHaveLength(1001);
    expect(result[1000]).toBe(1000);
    expect(ranges).toEqual([[0, 999], [1000, 1999]]);
  });

  it("stops after the final partial batch and propagates query errors", async () => {
    let calls = 0;
    const result = await fetchAllRowsInBatches(async () => {
      calls += 1;
      return { data: ["only row"], error: null };
    });

    expect(result).toEqual(["only row"]);
    expect(calls).toBe(1);

    const queryError = new Error("query failed");
    await expect(fetchAllRowsInBatches(async () => ({ data: null, error: queryError }))).rejects.toBe(queryError);
  });
});