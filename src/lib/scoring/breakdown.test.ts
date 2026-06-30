import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateBreakdown,
  ruleKeyToBreakdownType,
  type BreakdownType,
} from "./breakdown";
import { DEFAULT_SCORING_RULES } from "./rules";

test("maps each rule_key to its breakdown type", () => {
  const cases: Array<[string, BreakdownType]> = [
    ["correct_sign", "signo"],
    ["exact_score", "exacto"],
    ["group_pos_1st", "orden"],
    ["group_pos_4th", "orden"],
    ["qualify_r32", "clasificados"],
    ["qualify_champion", "clasificados"],
    ["exact_r32", "eliminatorias"],
    ["exact_final", "eliminatorias"],
    ["golden_boot", "premios"],
  ];
  for (const [ruleKey, expected] of cases) {
    assert.equal(ruleKeyToBreakdownType(ruleKey), expected, ruleKey);
  }
});

test("exact_score is 'exacto', not 'eliminatorias'", () => {
  assert.equal(ruleKeyToBreakdownType("exact_score"), "exacto");
});

test("unknown rule_key returns null", () => {
  assert.equal(ruleKeyToBreakdownType("nope"), null);
});

test("every default scoring rule maps to a known type", () => {
  for (const rule of DEFAULT_SCORING_RULES) {
    assert.notEqual(
      ruleKeyToBreakdownType(rule.ruleKey),
      null,
      `unmapped rule_key: ${rule.ruleKey}`
    );
  }
});

test("aggregateBreakdown sums points per type", () => {
  const totals = aggregateBreakdown([
    { rule_key: "correct_sign", points: 1 },
    { rule_key: "correct_sign", points: 1 },
    { rule_key: "exact_score", points: 1 },
    { rule_key: "group_pos_3rd", points: 2 },
    { rule_key: "qualify_r32", points: 1 },
    { rule_key: "exact_r16", points: 3 },
  ]);
  assert.deepEqual(totals, {
    signo: 2,
    exacto: 1,
    orden: 2,
    clasificados: 1,
    eliminatorias: 3,
    premios: 0,
  });
});
