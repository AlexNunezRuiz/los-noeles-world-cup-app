import assert from "node:assert/strict";
import test from "node:test";

import { findUserPredictionForPairing, isKnockoutPairingExact } from "./knockout";
import type { PredictedKnockoutMatch } from "./qualification";

test("acierto exacto suma con el mismo par aunque cambie local/visitante", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 2, away_team_id: 1, home_score: 1, away_score: 2 },
    }),
    true
  );
});

test("acierto exacto con misma orientación", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 },
    }),
    true
  );
});

test("par distinto no suma", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 3, away_team_id: 4, home_score: 2, away_score: 1 },
    }),
    false
  );
});

test("par correcto pero marcador distinto no suma", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 3, away_score: 0 },
    }),
    false
  );
});

test("empate exige ganador por penaltis por equipo (no por lado)", () => {
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { home_team_id: 2, away_team_id: 1, home_score: 1, away_score: 1, penalty_winner: "away" },
    }),
    true
  );
  assert.equal(
    isKnockoutPairingExact({
      actual: { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1, penaltyWinner: "home" },
      predicted: { home_team_id: 1, away_team_id: 2, home_score: 1, away_score: 1, penalty_winner: "away" },
    }),
    false
  );
});

test("findUserPredictionForPairing encuentra el par en la misma ronda en otro slot", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [73, { home_team_id: 10, away_team_id: 20, home_score: 1, away_score: 0 }],
    [80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([
    [73, "round_of_32"],
    [80, "round_of_32"],
  ]);
  const found = findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_32", 2, 1);
  assert.equal(found?.home_team_id, 1);
  assert.equal(found?.away_team_id, 2);
});

test("findUserPredictionForPairing no cruza de ronda", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [80, { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[80, "round_of_32"]]);
  assert.equal(findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_16", 1, 2), null);
});

test("findUserPredictionForPairing requiere los dos equipos", () => {
  const bracket = new Map<number, PredictedKnockoutMatch>([
    [80, { home_team_id: 1, away_team_id: 99, home_score: 2, away_score: 1 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[80, "round_of_32"]]);
  assert.equal(findUserPredictionForPairing(bracket, stageByMatchNumber, "round_of_32", 1, 2), null);
});
