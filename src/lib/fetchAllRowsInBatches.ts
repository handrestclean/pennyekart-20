export const USER_DATA_BATCH_SIZE = 1000;

export async function fetchAllRowsInBatches<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown | null;
  }>,
  batchSize = USER_DATA_BATCH_SIZE,
): Promise<T[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new RangeError("Batch size must be a positive integer.");
  }

  const rows: T[] = [];
  for (let from = 0; ; from += batchSize) {
    const { data, error } = await fetchPage(from, from + batchSize - 1);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);
    if (page.length < batchSize) return rows;
  }
}