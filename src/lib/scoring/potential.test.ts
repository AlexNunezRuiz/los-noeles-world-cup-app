import assert from "node:assert/strict";
import test from "node:test";

import { calculatePotentialSummary } from "./potential";

test("elige el mejor camino compatible cuando finalista y semifinalista se cruzan", () => {
  const result = calculatePotentialSummary({
    currentPoints: 10,
    rules: new Map([
      ["qualify_sf", 20],
      ["qualify_champion", 30],
      ["golden_boot", 10],
    ]),
    predictedMilestones: [
      { teamId: 1, ruleKey: "qualify_champion", round: "champion" },
      { teamId: 2, ruleKey: "qualify_sf", round: "semi_final" },
    ],
    conflicts: [[1, 2]],
    eliminatedTeamIds: new Set<number>(),
    awardPredictions: [{ awardType: "golden_boot", playerId: 9 }],
    actualAwards: [],
  });

  assert.equal(result.maximumPotentialPoints, 50);
  assert.equal(result.finalistsEliminated, 0);
  assert.equal(result.semifinalistsEliminated, 0);
});

test("descarta potencial de equipos eliminados y cuenta eliminados clave", () => {
  const result = calculatePotentialSummary({
    currentPoints: 7,
    rules: new Map([
      ["qualify_sf", 20],
      ["qualify_champion", 30],
    ]),
    predictedMilestones: [
      { teamId: 1, ruleKey: "qualify_champion", round: "champion" },
      { teamId: 1, ruleKey: "qualify_sf", round: "final" },
      { teamId: 2, ruleKey: "qualify_sf", round: "semi_final" },
    ],
    conflicts: [],
    eliminatedTeamIds: new Set([1, 2]),
    awardPredictions: [],
    actualAwards: [],
  });

  assert.equal(result.maximumPotentialPoints, 7);
  assert.equal(result.finalistsEliminated, 1);
  assert.equal(result.semifinalistsEliminated, 1);
});

test("incluye premios potenciales con puntos editables hasta que el premio oficial no coincida", () => {
  const pending = calculatePotentialSummary({
    currentPoints: 0,
    rules: new Map([["golden_ball", 14]]),
    predictedMilestones: [],
    conflicts: [],
    eliminatedTeamIds: new Set<number>(),
    awardPredictions: [{ awardType: "golden_ball", playerId: 5 }],
    actualAwards: [],
  });

  const missed = calculatePotentialSummary({
    currentPoints: 0,
    rules: new Map([["golden_ball", 14]]),
    predictedMilestones: [],
    conflicts: [],
    eliminatedTeamIds: new Set<number>(),
    awardPredictions: [{ awardType: "golden_ball", playerId: 5 }],
    actualAwards: [{ awardType: "golden_ball", playerId: 9 }],
  });

  assert.equal(pending.maximumPotentialPoints, 14);
  assert.equal(missed.maximumPotentialPoints, 0);
});
