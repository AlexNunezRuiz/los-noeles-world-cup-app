import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowEmptyState } from "./loading-state";

test("no muestra estado vacio mientras la carga inicial sigue pendiente", () => {
  assert.equal(shouldShowEmptyState(true, 0), false);
});

test("muestra estado vacio solo cuando la carga termino sin datos", () => {
  assert.equal(shouldShowEmptyState(false, 0), true);
  assert.equal(shouldShowEmptyState(false, 2), false);
});
