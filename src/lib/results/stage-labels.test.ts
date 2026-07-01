import { test } from "node:test";
import assert from "node:assert/strict";
import { stageShortLabel, eliminationLabel } from "./stage-labels";

test("stageShortLabel maps known stages", () => {
  assert.equal(stageShortLabel("round_of_32"), "Dieciseisavos");
  assert.equal(stageShortLabel("round_of_16"), "Octavos");
  assert.equal(stageShortLabel("quarter_final"), "Cuartos");
  assert.equal(stageShortLabel("semi_final"), "Semifinales");
  assert.equal(stageShortLabel("third_place"), "3er/4º");
  assert.equal(stageShortLabel("final"), "Final");
});

test("eliminationLabel covers champion / not_qualified / eliminated", () => {
  assert.equal(eliminationLabel({ kind: "champion" }), "Campeón");
  assert.equal(eliminationLabel({ kind: "not_qualified" }), "No la clasificabas");
  assert.equal(
    eliminationLabel({ kind: "eliminated", stage: "semi_final" }),
    "Semifinales"
  );
});
