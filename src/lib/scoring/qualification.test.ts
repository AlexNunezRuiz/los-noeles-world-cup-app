import assert from "node:assert/strict";
import test from "node:test";

import { didPredictTeamInStage, didPredictTeamWinStage } from "./qualification";

test("comprueba campeon usando el partido final aunque la regla sea qualify_champion", () => {
  const matches = [
    { match_number: 103, stage: "final" },
    { match_number: 102, stage: "third_place" },
  ];
  const predictedMatches = new Map([
    [103, { home_team_id: 1, away_team_id: 2 }],
    [102, { home_team_id: 3, away_team_id: 4 }],
  ]);

  assert.equal(didPredictTeamInStage(matches, predictedMatches, "final", 1), true);
  assert.equal(didPredictTeamInStage(matches, predictedMatches, "final_winner", 1), false);
});

test("campeon y tercer puesto exigen que el equipo sea ganador previsto del partido", () => {
  const matches = [{ match_number: 103, stage: "final" }];
  const predictedMatches = new Map([
    [103, { home_team_id: 1, away_team_id: 2, home_score: 1, away_score: 2 }],
  ]);

  assert.equal(didPredictTeamWinStage(matches, predictedMatches, "final", 1), false);
  assert.equal(didPredictTeamWinStage(matches, predictedMatches, "final", 2), true);
});

test("ganador previsto por penaltis cuenta en partidos empatados", () => {
  const matches = [{ match_number: 102, stage: "third_place" }];
  const predictedMatches = new Map([
    [102, { home_team_id: 3, away_team_id: 4, home_score: 1, away_score: 1, penalty_winner: "home" as const }],
  ]);

  assert.equal(didPredictTeamWinStage(matches, predictedMatches, "third_place", 3), true);
  assert.equal(didPredictTeamWinStage(matches, predictedMatches, "third_place", 4), false);
});
