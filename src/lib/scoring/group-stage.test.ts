import assert from "node:assert/strict";
import test from "node:test";

import { scoreGroupPositions, scoreGroupStageMatch } from "./group-stage";

test("los puntos por clasificacion de grupo no apuntan a un partido inexistente", () => {
  const events = scoreGroupPositions(
    "A",
    [{ team_id: 10, position: 1 }],
    new Map([["group_pos_1st", 1]]),
    [{ user_id: "u1", group_letter: "A", team_id: 10, position: 1 }]
  );

  assert.equal(events[0]?.match_id, null);
});

test("scoreGroupStageMatch puntua signo y exacto solo con predicciones acertadas", () => {
  const match = { id: 1, home_team_id: 1, away_team_id: 2, home_score: 2, away_score: 0, group_letter: "A" };
  const rules = new Map([
    ["correct_sign", 1],
    ["exact_score", 2],
  ]);

  const events = scoreGroupStageMatch(
    match,
    [
      { user_id: "acierta-exacto", match_id: 1, home_score: 2, away_score: 0 },
      { user_id: "acierta-signo", match_id: 1, home_score: 1, away_score: 0 },
      { user_id: "falla", match_id: 1, home_score: 0, away_score: 1 },
    ],
    rules
  );

  assert.deepEqual(
    events.map((e) => `${e.user_id}:${e.rule_key}`).sort(),
    ["acierta-exacto:correct_sign", "acierta-exacto:exact_score", "acierta-signo:correct_sign"]
  );
});
