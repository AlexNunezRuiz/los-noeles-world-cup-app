import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_SCORING_RULES,
  SCORING_CATEGORY_LABELS,
  getScoringRuleLabel,
} from "./rules";

test("define los puntos predeterminados acordados", () => {
  const rules = new Map(DEFAULT_SCORING_RULES.map((rule) => [rule.ruleKey, rule]));

  assert.equal(rules.get("correct_sign")?.points, 1);
  assert.equal(rules.get("exact_score")?.points, 1);
  assert.equal(rules.get("group_pos_1st")?.points, 1);
  assert.equal(rules.get("group_pos_2nd")?.points, 1);
  assert.equal(rules.get("group_pos_3rd")?.points, 2);
  assert.equal(rules.get("group_pos_4th")?.points, 2);
  assert.equal(rules.get("qualify_r32")?.points, 1);
  assert.equal(rules.get("qualify_r16")?.points, 3);
  assert.equal(rules.get("qualify_qf")?.points, 6);
  assert.equal(rules.get("qualify_sf")?.points, 10);
  assert.equal(rules.get("qualify_finalist")?.points, 15);
  assert.equal(rules.get("qualify_champion")?.points, 25);
  assert.equal(rules.get("qualify_third")?.points, 12);
  assert.equal(rules.get("exact_r32")?.points, 2);
  assert.equal(rules.get("exact_r16")?.points, 3);
  assert.equal(rules.get("exact_qf")?.points, 5);
  assert.equal(rules.get("exact_sf")?.points, 7);
  assert.equal(rules.get("exact_third")?.points, 8);
  assert.equal(rules.get("exact_final")?.points, 10);
  assert.equal(rules.get("golden_boot")?.points, 10);
  assert.equal(rules.get("golden_ball")?.points, 10);
  assert.equal(rules.get("golden_glove")?.points, 10);
});

test("expone etiquetas correctas para admin y normas", () => {
  assert.equal(SCORING_CATEGORY_LABELS.qualification, "Clasificacion por ronda");
  assert.equal(getScoringRuleLabel("exact_r32"), "Resultado exacto en dieciseisavos");
  assert.equal(getScoringRuleLabel("exact_r16"), "Resultado exacto en octavos");
  assert.equal(getScoringRuleLabel("exact_qf"), "Resultado exacto en cuartos");
  assert.equal(getScoringRuleLabel("exact_sf"), "Resultado exacto en semifinales");
  assert.equal(getScoringRuleLabel("qualify_finalist"), "Equipo finalista");
});
