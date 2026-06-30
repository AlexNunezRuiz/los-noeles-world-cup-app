import assert from "node:assert/strict";
import test from "node:test";

import { seedRound32FromGroups, cascadeKnockoutWinners } from "./actual-bracket";
import { calculateGroupStandings } from "./standings";

function standings() {
  const a = calculateGroupStandings([1, 2], [
    { home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 0 },
  ]);
  const b = calculateGroupStandings([3, 4], [
    { home_team_id: 3, away_team_id: 4, home_score: 1, away_score: 0 },
  ]);
  return new Map([
    ["A", a],
    ["B", b],
  ]);
}

const positions = [
  { match_number: 73, slot: "home" as const, source_type: "group_winner", source_group: "A" },
  { match_number: 73, slot: "away" as const, source_type: "group_runner_up", source_group: "B" },
  { match_number: 89, slot: "home" as const, source_type: "match_winner", source_match_number: 73 },
];

test("seedRound32FromGroups rellena slots vacíos de R32 desde los grupos", () => {
  const matches = [
    { match_number: 73, stage: "round_of_32", home_team_id: null, away_team_id: null },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null },
  ];
  const assignments = seedRound32FromGroups(standings(), matches, positions);
  assert.deepEqual(
    assignments.find((a) => a.match_number === 73 && a.slot === "home"),
    { match_number: 73, slot: "home", team_id: 1 }
  );
  assert.deepEqual(
    assignments.find((a) => a.match_number === 73 && a.slot === "away"),
    { match_number: 73, slot: "away", team_id: 4 }
  );
});

test("seedRound32FromGroups corrige (sobrescribe) un slot R32 con el equipo correcto del grupo", () => {
  const matches = [
    { match_number: 73, stage: "round_of_32", home_team_id: 99, away_team_id: null },
  ];
  const assignments = seedRound32FromGroups(standings(), matches, positions);
  // El home de P73 es el 1º del grupo A (equipo 1): debe sobrescribir el 99.
  assert.deepEqual(
    assignments.find((a) => a.match_number === 73 && a.slot === "home"),
    { match_number: 73, slot: "home", team_id: 1 }
  );
});

test("seedRound32FromGroups no re-emite un slot que ya tiene el equipo correcto", () => {
  const matches = [
    { match_number: 73, stage: "round_of_32", home_team_id: 1, away_team_id: 4 },
  ];
  const assignments = seedRound32FromGroups(standings(), matches, positions);
  assert.equal(assignments.length, 0);
});

test("cascadeKnockoutWinners avanza el ganador al slot vacío de la ronda siguiente", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 3,
      away_score: 0,
      penalty_winner_team_id: null,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.deepEqual(assignments, [{ match_number: 89, slot: "home", team_id: 1 }]);
});

test("cascadeKnockoutWinners respeta el ganador por penaltis", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 1,
      away_score: 1,
      penalty_winner_team_id: 4,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: null, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.deepEqual(assignments, [{ match_number: 89, slot: "home", team_id: 4 }]);
});

test("cascadeKnockoutWinners no pisa un slot ya fijado", () => {
  const matches = [
    {
      match_number: 73,
      stage: "round_of_32",
      home_team_id: 1,
      away_team_id: 4,
      home_score: 3,
      away_score: 0,
      penalty_winner_team_id: null,
      is_finished: true,
    },
    { match_number: 89, stage: "round_of_16", home_team_id: 7, away_team_id: null, is_finished: false },
  ];
  const assignments = cascadeKnockoutWinners(matches, positions);
  assert.equal(assignments.length, 0);
});
