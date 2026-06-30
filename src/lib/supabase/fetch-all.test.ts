import assert from "node:assert/strict";
import test from "node:test";

import { fetchAllRows, type RangeResult } from "./fetch-all";

// A fake PostgREST source that holds `total` rows and enforces a server-side
// cap, mimicking the real truncation behaviour that caused the scoring bug.
function fakeSource(total: number, serverCap = 1000) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const pages: Array<[number, number]> = [];
  return {
    pages,
    page(from: number, to: number): PromiseLike<RangeResult<{ id: number }>> {
      pages.push([from, to]);
      const cappedTo = Math.min(to, from + serverCap - 1);
      return Promise.resolve({ data: rows.slice(from, cappedTo + 1), error: null });
    },
  };
}

test("fetchAllRows returns every row past the server cap", async () => {
  const src = fakeSource(2500, 1000);
  const { data, error } = await fetchAllRows((from, to) => src.page(from, to), 1000);
  assert.equal(error, null);
  assert.equal(data?.length, 2500);
  assert.deepEqual(
    data?.map((r) => r.id).slice(0, 3),
    [0, 1, 2]
  );
  assert.equal(data?.[2499].id, 2499);
  // 0-999, 1000-1999, 2000-2999 (last page short -> stop)
  assert.equal(src.pages.length, 3);
});

test("fetchAllRows handles an exact multiple of the page size", async () => {
  const src = fakeSource(2000, 1000);
  const { data } = await fetchAllRows((from, to) => src.page(from, to), 1000);
  assert.equal(data?.length, 2000);
  // Needs the extra empty page to know it finished.
  assert.equal(src.pages.length, 3);
});

test("fetchAllRows returns a single page when below the cap", async () => {
  const src = fakeSource(42, 1000);
  const { data } = await fetchAllRows((from, to) => src.page(from, to), 1000);
  assert.equal(data?.length, 42);
  assert.equal(src.pages.length, 1);
});

test("fetchAllRows propagates errors and stops paging", async () => {
  let calls = 0;
  const { data, error } = await fetchAllRows<{ id: number }>((from) => {
    calls += 1;
    if (from === 0) return Promise.resolve({ data: Array.from({ length: 1000 }, (_, i) => ({ id: i })), error: null });
    return Promise.resolve({ data: null, error: { message: "boom" } });
  }, 1000);
  assert.equal(data, null);
  assert.equal(error?.message, "boom");
  assert.equal(calls, 2);
});
