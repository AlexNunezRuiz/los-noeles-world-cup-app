import assert from "node:assert/strict";
import test from "node:test";

import { formatLastPredictionUpdate } from "./last-update";

test("muestra pendiente cuando no hay actualizaciones", () => {
  assert.equal(formatLastPredictionUpdate(null), "Sin guardar");
});

test("formatea la ultima actualizacion de predicciones", () => {
  const result = formatLastPredictionUpdate("2026-06-03T20:15:30Z");

  assert.match(result, /3\/6\/2026|03\/06\/2026/);
  assert.match(result, /20:15|22:15/);
});
