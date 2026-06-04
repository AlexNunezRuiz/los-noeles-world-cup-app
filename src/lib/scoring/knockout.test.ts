import assert from "node:assert/strict";
import test from "node:test";

import { isKnockoutExactEligible } from "./knockout";

test("el exacto de eliminatoria solo suma con mismo marcador y mismo cruce", () => {
  assert.equal(
    isKnockoutExactEligible({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
    }),
    true
  );

  assert.equal(
    isKnockoutExactEligible({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { homeTeamId: 3, awayTeamId: 4, homeScore: 2, awayScore: 1 },
    }),
    false
  );
});

test("en empates de eliminatoria exige tambien ganador por penaltis", () => {
  assert.equal(
    isKnockoutExactEligible({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "away" },
    }),
    false
  );

  assert.equal(
    isKnockoutExactEligible({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
    }),
    true
  );
});
