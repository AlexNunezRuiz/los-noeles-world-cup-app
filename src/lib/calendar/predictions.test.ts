import assert from "node:assert/strict";
import test from "node:test";

import { attachPredictionsToCalendarMatches } from "./predictions";

test("adjunta el pronostico del usuario a cada partido del calendario", () => {
  const matches = [
    { id: 1, name: "Canada - Mexico" },
    { id: 2, name: "Spain - Japan" },
  ];

  const result = attachPredictionsToCalendarMatches(matches, [
    { match_id: 2, home_score: 1, away_score: 0 },
  ]);

  assert.deepEqual(result, [
    { id: 1, name: "Canada - Mexico", prediction: null },
    { id: 2, name: "Spain - Japan", prediction: { home: 1, away: 0 } },
  ]);
});

test("no muta los partidos originales", () => {
  const matches = [{ id: 1, prediction: { home: 9, away: 9 } }];

  attachPredictionsToCalendarMatches(matches, [
    { match_id: 1, home_score: 2, away_score: 1 },
  ]);

  assert.deepEqual(matches, [{ id: 1, prediction: { home: 9, away: 9 } }]);
});
