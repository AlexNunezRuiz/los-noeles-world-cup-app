import assert from "node:assert/strict";
import test from "node:test";

import { buildUserBracket } from "./user-bracket";

test("buildUserBracket resuelve los equipos de R32 desde las posiciones predichas", () => {
  const baseMatches = [
    { match_number: 73, stage: "round_of_32", home_placeholder: "1A", away_placeholder: "2B" },
  ];
  const predictedStandings = [
    { group_letter: "A", team_id: 1, position: 1, points: 9, goals_for: 5, goals_against: 1, goal_difference: 4 },
    { group_letter: "B", team_id: 2, position: 2, points: 4, goals_for: 3, goals_against: 3, goal_difference: 0 },
  ];
  const positions = [
    { match_number: 73, slot: "home" as const, source_type: "group_winner", source_group: "A" },
    { match_number: 73, slot: "away" as const, source_type: "group_runner_up", source_group: "B" },
  ];

  const { byMatchNumber, stageByMatchNumber } = buildUserBracket({
    baseMatches,
    predictedStandings,
    bestThirdOrder: [],
    predictions: [{ match_number: 73, home_score: 1, away_score: 0, penalty_winner: null }],
    bracketPositions: positions,
  });

  assert.equal(stageByMatchNumber.get(73), "round_of_32");
  const m = byMatchNumber.get(73);
  assert.equal(m?.home_team_id, 1);
  assert.equal(m?.away_team_id, 2);
  assert.equal(m?.home_score, 1);
  assert.equal(m?.away_score, 0);
});
