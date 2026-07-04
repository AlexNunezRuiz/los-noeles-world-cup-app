import { test } from "node:test";
import assert from "node:assert/strict";
import type { BuiltUserBracket } from "@/lib/results/user-bracket";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
import { teamFurthestReach, reachDisplay } from "./team-progression";

type MatchDef = { stage: string; match: PredictedKnockoutMatch };

function bracket(defs: Record<number, MatchDef>): BuiltUserBracket {
  const byMatchNumber = new Map<number, PredictedKnockoutMatch>();
  const stageByMatchNumber = new Map<number, string>();
  for (const [num, def] of Object.entries(defs)) {
    byMatchNumber.set(Number(num), def.match);
    stageByMatchNumber.set(Number(num), def.stage);
  }
  return { byMatchNumber, stageByMatchNumber };
}

const win = (home: number, away: number, homeScore: number, awayScore: number): PredictedKnockoutMatch => ({
  home_team_id: home,
  away_team_id: away,
  home_score: homeScore,
  away_score: awayScore,
});

test("no aparece en eliminatorias → none", () => {
  const b = bracket({ 73: { stage: "round_of_32", match: win(10, 20, 1, 0) } });
  assert.deepEqual(teamFurthestReach(b, 99), { kind: "none" });
});

test("eliminado en dieciseisavos", () => {
  // 5 pierde 0-2 en R32
  const b = bracket({ 73: { stage: "round_of_32", match: win(5, 6, 0, 2) } });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "eliminated", stage: "round_of_32" });
});

test("eliminado en octavos", () => {
  const b = bracket({
    73: { stage: "round_of_32", match: win(5, 6, 1, 0) },
    89: { stage: "round_of_16", match: win(5, 8, 0, 1) },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "eliminated", stage: "round_of_16" });
});

test("eliminado en cuartos", () => {
  const b = bracket({
    73: { stage: "round_of_32", match: win(5, 6, 1, 0) },
    89: { stage: "round_of_16", match: win(5, 8, 1, 0) },
    97: { stage: "quarter_final", match: win(5, 9, 1, 3) },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "eliminated", stage: "quarter_final" });
});

test("campeón: gana la final", () => {
  const b = bracket({ 104: { stage: "final", match: win(5, 9, 2, 1) } });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "champion" });
});

test("subcampeón: pierde la final", () => {
  const b = bracket({ 104: { stage: "final", match: win(5, 9, 1, 2) } });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "runner_up" });
});

test("campeón por penaltis", () => {
  const b = bracket({
    104: { stage: "final", match: { home_team_id: 5, away_team_id: 9, home_score: 1, away_score: 1, penalty_winner: "home" } },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "champion" });
});

test("3er puesto: gana el partido por el tercer puesto", () => {
  const b = bracket({ 103: { stage: "third_place", match: win(5, 9, 3, 0) } });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "third" });
});

test("4º puesto: pierde el partido por el tercer puesto", () => {
  const b = bracket({ 103: { stage: "third_place", match: win(5, 9, 0, 3) } });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "fourth" });
});

test("semifinalista: aparece en 3er puesto sin resultado", () => {
  const b = bracket({
    103: { stage: "third_place", match: { home_team_id: 5, away_team_id: 9 } },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "semifinalist" });
});

test("semifinalista: pierde la semi sin 3er puesto resuelto", () => {
  const b = bracket({
    101: { stage: "semi_final", match: win(5, 9, 0, 1) },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "semifinalist" });
});

test("reached: aparece en R32 sin resultado", () => {
  const b = bracket({
    73: { stage: "round_of_32", match: { home_team_id: 5, away_team_id: 6 } },
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "reached", stage: "round_of_32" });
});

test("toma la ronda más profunda aunque el orden del mapa sea distinto", () => {
  const b = bracket({
    97: { stage: "quarter_final", match: win(5, 9, 2, 1) },
    73: { stage: "round_of_32", match: win(5, 6, 1, 0) },
    89: { stage: "round_of_16", match: win(5, 8, 1, 0) },
    // gana cuartos pero la semi no está poblada → llega a semis
  });
  assert.deepEqual(teamFurthestReach(b, 5), { kind: "reached", stage: "semi_final" });
});

test("reachDisplay: campeón es el de mayor profundidad", () => {
  const champ = reachDisplay({ kind: "champion" });
  const none = reachDisplay({ kind: "none" });
  const r32 = reachDisplay({ kind: "eliminated", stage: "round_of_32" });
  assert.equal(champ.label, "Campeón");
  assert.ok(champ.depth > r32.depth);
  assert.ok(r32.depth > none.depth);
  assert.equal(none.label, "No la clasifica");
});
