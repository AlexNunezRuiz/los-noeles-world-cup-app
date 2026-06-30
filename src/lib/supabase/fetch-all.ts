// Paginated fetch for Supabase/PostgREST queries.
//
// PostgREST caps every response at a maximum number of rows (the project's
// `db-max-rows`, ~1000-2000). An unbounded `select("*")` on a large table is
// therefore SILENTLY truncated, which previously made the scoring recalc read
// only a subset of users' predictions and undercount their points.
//
// `fetchAllRows` walks the result set with `.range(from, to)` until a short page
// is returned, so callers always get every row regardless of the server cap.

export interface RangeResult<T> {
  data: T[] | null;
  error: { message?: string } | null;
}

export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<RangeResult<T>>,
  pageSize = 1000
): Promise<RangeResult<T>> {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await buildPage(from, to);
    if (error) return { data: null, error };

    const rows = data ?? [];
    all.push(...rows);

    // A page shorter than the requested size means we reached the end.
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { data: all, error: null };
}
