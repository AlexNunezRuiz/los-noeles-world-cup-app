import assert from "node:assert/strict";
import test from "node:test";

import { applyPredictionLockConfigChange, configRowsToRecord, isPredictionsLocked } from "./lock";

test("convierte filas de configuracion en mapa y calcula bloqueo manual", () => {
  const config = configRowsToRecord([
    { key: "predictions_locked", value: "true" },
    { key: "lock_datetime", value: "2026-06-11T15:00:00Z" },
  ]);

  assert.equal(config.predictions_locked, "true");
  assert.equal(isPredictionsLocked(config, new Date("2026-06-01T12:00:00Z")), true);
});

test("aplica cambios realtime del bloqueo sin perder la fecha limite", () => {
  const config = configRowsToRecord([
    { key: "predictions_locked", value: "false" },
    { key: "lock_datetime", value: "2026-06-11T15:00:00Z" },
  ]);

  const next = applyPredictionLockConfigChange(config, {
    key: "predictions_locked",
    value: "true",
  });

  assert.deepEqual(next, {
    predictions_locked: "true",
    lock_datetime: "2026-06-11T15:00:00Z",
  });
  assert.equal(isPredictionsLocked(next, new Date("2026-06-01T12:00:00Z")), true);
}
);
