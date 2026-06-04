import assert from "node:assert/strict";
import test from "node:test";

import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from "./datetime";

test("convierte una fecha local de inicio a ISO y vuelve al mismo valor local", () => {
  const localValue = "2026-06-11T21:00";
  const iso = datetimeLocalValueToIso(localValue);

  assert.equal(isoToDatetimeLocalValue(iso), localValue);
});
