import assert from "node:assert/strict";
import test from "node:test";

import { compareRealMatchToUser } from "./knockout-comparison";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

const stageByMatchNumber = new Map<number, string>([
  [73, "round_of_32"],
  [80, "round_of_32"],
  [89, "round_of_16"],
]);

function bracket(entries: [number, PredictedKnockoutMatch][]) {
  return new Map<number, PredictedKnockoutMatch>(entries);
}

test("acierto exacto del cruce (en otro slot) → exact", () => {
  const userBracket = bracket([[80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 2,
    realAwayScore: 1,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "exact");
});

test("cruce correcto pero marcador no → pairing", () => {
  const userBracket = bracket([[80, { home_team_id: 1, away_team_id: 2, home_score: 0, away_score: 0, penalty_winner: "home" }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 2,
    realAwayScore: 1,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "pairing");
});

test("sin el cruce: marca por equipo si lo lleva en esa ronda y si avanza", () => {
  const userBracket = bracket([[73, { home_team_id: 1, away_team_id: 9, home_score: 3, away_score: 0 }]]);
  const result = compareRealMatchToUser({
    userBracket,
    stageByMatchNumber,
    stage: "round_of_32",
    realHomeTeamId: 1,
    realAwayTeamId: 2,
    realHomeScore: 1,
    realAwayScore: 0,
    realPenaltyWinnerTeamId: null,
  });
  assert.equal(result.kind, "teams");
  if (result.kind === "teams") {
    assert.equal(result.home.inRound, true);
    assert.equal(result.home.advances, true);
    assert.equal(result.away.inRound, false);
    assert.equal(result.away.advances, false);
  }
});
