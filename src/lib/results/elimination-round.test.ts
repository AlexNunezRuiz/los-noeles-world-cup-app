import { test } from "node:test";
import assert from "node:assert/strict";
import { getUserEliminationRound } from "./elimination-round";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

// Helper: build the two maps from a list of {match_number, stage, home, away, hs, as, pen}
function build(
  rows: Array<{
    match_number: number;
    stage: string;
    home?: number;
    away?: number;
    hs?: number;
    as?: number;
    pen?: "home" | "away";
  }>
) {
  const bracket = new Map<number, PredictedKnockoutMatch>();
  const stageByMatchNumber = new Map<number, string>();
  for (const r of rows) {
    bracket.set(r.match_number, {
      home_team_id: r.home,
      away_team_id: r.away,
      home_score: r.hs,
      away_score: r.as,
      penalty_winner: r.pen,
    });
    stageByMatchNumber.set(r.match_number, r.stage);
  }
  return { bracket, stageByMatchNumber };
}

test("team eliminated in round_of_32 (appears and loses)", () => {
  // Team 10 loses its R32 match to team 11
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "eliminated", stage: "round_of_32" });
});

test("team eliminated in semi_final", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 2, as: 0 },
    { match_number: 20, stage: "round_of_16", home: 10, away: 12, hs: 1, as: 0 },
    { match_number: 30, stage: "quarter_final", home: 10, away: 13, hs: 3, as: 2 },
    { match_number: 40, stage: "semi_final", home: 10, away: 14, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "eliminated", stage: "semi_final" });
});

test("team is champion when it wins the final", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 40, stage: "semi_final", home: 10, away: 14, hs: 2, as: 1 },
    { match_number: 50, stage: "final", home: 10, away: 15, hs: 1, as: 0 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "champion" });
});

test("champion decided on penalties (draw + penalty_winner)", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 50, stage: "final", home: 10, away: 15, hs: 1, as: 1, pen: "home" },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 10);
  assert.deepEqual(res, { kind: "champion" });
});

test("team not in bracket → not_qualified", () => {
  const { bracket, stageByMatchNumber } = build([
    { match_number: 1, stage: "round_of_32", home: 10, away: 11, hs: 0, as: 1 },
  ]);
  const res = getUserEliminationRound(bracket, stageByMatchNumber, 99);
  assert.deepEqual(res, { kind: "not_qualified" });
});
