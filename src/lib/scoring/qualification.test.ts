import assert from "node:assert/strict";
import test from "node:test";

import {
  didPredictTeamInStage,
  didPredictTeamLoseStage,
  didPredictTeamWinStage,
  scoreQualification,
  type PredictedKnockoutMatch,
} from "./qualification";

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

test("subcampeon y cuarto puesto exigen que el equipo sea perdedor previsto del partido", () => {
  const matches = [
    { match_number: 103, stage: "final" },
    { match_number: 102, stage: "third_place" },
  ];
  const predictedMatches = new Map([
    [103, { home_team_id: 1, away_team_id: 2, home_score: 1, away_score: 2 }],
    [102, { home_team_id: 3, away_team_id: 4, home_score: 0, away_score: 0, penalty_winner: "home" as const }],
  ]);

  assert.equal(didPredictTeamLoseStage(matches, predictedMatches, "final", 1), true);
  assert.equal(didPredictTeamLoseStage(matches, predictedMatches, "final", 2), false);
  assert.equal(didPredictTeamLoseStage(matches, predictedMatches, "third_place", 4), true);
  assert.equal(didPredictTeamLoseStage(matches, predictedMatches, "third_place", 3), false);
});

test("los puntos por clasificacion de ronda no apuntan a un partido inexistente", () => {
  const events = scoreQualification(
    [
      {
        match_number: 73,
        stage: "round_of_32",
        home_team_id: 1,
        away_team_id: 2,
        home_score: null,
        away_score: null,
        penalty_winner_team_id: null,
        is_finished: false,
      },
    ],
    new Map([["qualify_r32", 1]]),
    new Map([
      [
        "u1",
        new Map([
          [73, { home_team_id: 1, away_team_id: 2 }],
        ]),
      ],
    ])
  );

  assert.equal(events[0]?.match_id, null);
});

test("no puntua clasificados a dieciseisavos hasta que todos los cruces esten definidos", () => {
  const events = scoreQualification(
    [
      {
        match_number: 73,
        stage: "round_of_32",
        home_team_id: 1,
        away_team_id: 2,
        home_score: null,
        away_score: null,
        penalty_winner_team_id: null,
        is_finished: false,
      },
      {
        match_number: 74,
        stage: "round_of_32",
        home_team_id: 3,
        away_team_id: null,
        home_score: null,
        away_score: null,
        penalty_winner_team_id: null,
        is_finished: false,
      },
    ],
    new Map([["qualify_r32", 1]]),
    new Map([
      [
        "u1",
        new Map([
          [73, { home_team_id: 1, away_team_id: 2 }],
        ]),
      ],
    ])
  );

  assert.deepEqual(events, []);
});

test("clasificado a ronda puntúa aunque el equipo llegue por otra rama (#4)", () => {
  const matches = [
    { match_number: 89, stage: "round_of_16" },
    { match_number: 90, stage: "round_of_16" },
  ];
  const userBracket = new Map<number, PredictedKnockoutMatch>([
    [90, { home_team_id: 7, away_team_id: 8 }],
  ]);
  assert.equal(didPredictTeamInStage(matches, userBracket, "round_of_16", 7), true);
  assert.equal(didPredictTeamInStage(matches, userBracket, "round_of_16", 99), false);
});
