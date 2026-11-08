export interface CommunityAreaRow {
  creator_area_id: string | null;
}

export const filterCommunityRowsByArea = <T extends CommunityAreaRow>(
  rows: T[],
  areaId: string,
) => areaId === "all" ? rows : rows.filter((row) => row.creator_area_id === areaId);