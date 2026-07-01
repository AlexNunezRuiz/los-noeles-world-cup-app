import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreKnockoutExact } from "./knockout";
import type { PredictedKnockoutMatch } from "./qualification";

test("no da puntos exactos cuando el usuario llevaba otro cruce en esa ronda", () => {
  // Partido real: equipos 100 vs 200, 2-0, en dieciseisavos, casilla match_number 1.
  const realMatch = {
    id: 5,
    match_number: 1,
    stage: "round_of_32",
    home_score: 2,
    away_score: 0,
    penalty_winner_team_id: null,
    home_team_id: 100,
    away_team_id: 200,
  };

  // El usuario NO llevaba a 100 vs 200. En su casilla puso 300 vs 400, con 2-0.
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [1, { home_team_id: 300, away_team_id: 400, home_score: 2, away_score: 0 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[1, "round_of_32"]]);
  const rules = new Map<string, number>([["exact_r32", 5]]);

  const events = scoreKnockoutExact(
    realMatch,
    rules,
    new Map([["user-1", userBracket]]),
    stageByMatchNumber
  );

  assert.equal(events.length, 0, "no debe puntuar: el cruce era distinto");
});

test("sí da puntos exactos cuando el cruce y marcador coinciden por pareja", () => {
  const realMatch = {
    id: 5,
    match_number: 1,
    stage: "round_of_32",
    home_score: 2,
    away_score: 0,
    penalty_winner_team_id: null,
    home_team_id: 100,
    away_team_id: 200,
  };
  // Usuario llevaba el mismo par (aunque en orden invertido de casilla) con 0-2.
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [1, { home_team_id: 200, away_team_id: 100, home_score: 0, away_score: 2 }],
  ]);
  const stageByMatchNumber = new Map<number, string>([[1, "round_of_32"]]);
  const rules = new Map<string, number>([["exact_r32", 5]]);

  const events = scoreKnockoutExact(
    realMatch,
    rules,
    new Map([["user-1", userBracket]]),
    stageByMatchNumber
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].points, 5);
});
