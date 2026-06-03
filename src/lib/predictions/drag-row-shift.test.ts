import assert from "node:assert/strict";
import test from "node:test";

import { getDragRowShift } from "./drag-row-shift";

test("shifts every row between the dragged row and a lower drop target upward", () => {
  const rows = [10, 20, 30, 40];

  assert.equal(getDragRowShift(rows, 10, 40, 10), 0);
  assert.equal(getDragRowShift(rows, 10, 40, 20), -1);
  assert.equal(getDragRowShift(rows, 10, 40, 30), -1);
  assert.equal(getDragRowShift(rows, 10, 40, 40), -1);
});

test("shifts every row between the dragged row and a higher drop target downward", () => {
  const rows = [10, 20, 30, 40];

  assert.equal(getDragRowShift(rows, 40, 10, 40), 0);
  assert.equal(getDragRowShift(rows, 40, 10, 30), 1);
  assert.equal(getDragRowShift(rows, 40, 10, 20), 1);
  assert.equal(getDragRowShift(rows, 40, 10, 10), 1);
});

test("does not shift rows outside the drag range", () => {
  const rows = [10, 20, 30, 40, 50];

  assert.equal(getDragRowShift(rows, 20, 40, 10), 0);
  assert.equal(getDragRowShift(rows, 20, 40, 50), 0);
  assert.equal(getDragRowShift(rows, 20, 40, 20), 0);
});
