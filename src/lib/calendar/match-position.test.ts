import assert from "node:assert/strict";
import test from "node:test";

import { getAutoScrollDay, sortMatchesByCalendar } from "./match-position";

const matches = [
  { id: 3, match_number: 3, match_date: "2026-06-13T19:00:00.000Z", is_finished: true },
  { id: 1, match_number: 1, match_date: "2026-06-11T19:00:00.000Z", is_finished: true },
  { id: 2, match_number: 2, match_date: "2026-06-11T16:00:00.000Z", is_finished: true },
  { id: 4, match_number: 4, match_date: "2026-06-15T19:00:00.000Z", is_finished: false },
];

test("sorts dated matches by kickoff time and then match number", () => {
  assert.deepEqual(sortMatchesByCalendar(matches).map((match) => match.match_number), [2, 1, 3, 4]);
});

test("chooses today when today exists in the rendered matches", () => {
  assert.equal(getAutoScrollDay(matches, "2026-06-15"), "2026-06-15");
});

test("falls back to the latest finished day when today has no rendered matches", () => {
  assert.equal(getAutoScrollDay(matches.slice(0, 3), "2026-06-15"), "2026-06-13");
});

test("falls forward to the next scheduled day before the first match", () => {
  assert.equal(getAutoScrollDay(matches, "2026-06-10"), "2026-06-11");
});

test("chooses the final played day after all matches are finished", () => {
  assert.equal(getAutoScrollDay(matches.slice(0, 3), "2026-07-20"), "2026-06-13");
});
