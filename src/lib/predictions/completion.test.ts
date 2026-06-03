import assert from "node:assert/strict";
import test from "node:test";

import { getPorraCompletion } from "./completion";

test("calcula estados sin empezar parcial y completo por fase", () => {
  const result = getPorraCompletion({
    groupPredictionCount: 72,
    groupStandingRows: 48,
    knockoutPredictionCount: 4,
    awardPredictionCount: 0,
  });

  assert.equal(result.grupos.state, "complete");
  assert.equal(result.grupos.label, "72/72");
  assert.equal(result.clasificados.state, "complete");
  assert.equal(result.clasificados.label, "12/12");
  assert.equal(result.cuadro.state, "partial");
  assert.equal(result.cuadro.label, "4/32");
  assert.equal(result.premios.state, "empty");
  assert.equal(result.premios.label, "0/3");
});

test("limita los contadores al total esperado", () => {
  const result = getPorraCompletion({
    groupPredictionCount: 100,
    groupStandingRows: 60,
    knockoutPredictionCount: 40,
    awardPredictionCount: 8,
  });

  assert.equal(result.grupos.completed, 72);
  assert.equal(result.clasificados.completed, 12);
  assert.equal(result.cuadro.completed, 32);
  assert.equal(result.premios.completed, 3);
});
