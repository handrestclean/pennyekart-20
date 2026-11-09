export type CommunityListSort = "top" | "orders" | "profit" | "members";

export interface CommunityListRow {
  creator_local_body_id?: string | null;
  member_count: number;
  order_count: number;
  profit: number;
}

export function filterAndSortCommunities<T extends CommunityListRow>(
  rows: T[],
  panchayathFilter: string,
  sort: CommunityListSort,
): T[] {
  const filtered = rows.filter((row) => {
    if (panchayathFilter === "all") return true;
    if (panchayathFilter === "not_set") return !row.creator_local_body_id;
    return row.creator_local_body_id === panchayathFilter;
  });

  return [...filtered].sort((a, b) => {
    if (sort === "orders") return b.order_count - a.order_count || b.profit - a.profit;
    if (sort === "profit") return b.profit - a.profit || b.order_count - a.order_count;
    if (sort === "members") return b.member_count - a.member_count || b.order_count - a.order_count;
    return b.order_count - a.order_count || b.profit - a.profit || b.member_count - a.member_count;
  });
}