import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_APP_ROUTE } from "./default-route";

test("uses resultados as the default app route", () => {
  assert.equal(DEFAULT_APP_ROUTE, "/resultados");
});
