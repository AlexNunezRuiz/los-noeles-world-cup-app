import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdjacentPredictionStage,
  getSwipeDirection,
} from "./swipe-navigation";

test("detects horizontal swipes and ignores vertical scroll", () => {
  assert.equal(getSwipeDirection({ deltaX: -90, deltaY: 18 }), "next");
  assert.equal(getSwipeDirection({ deltaX: 90, deltaY: 18 }), "previous");
  assert.equal(getSwipeDirection({ deltaX: -60, deltaY: 4 }), null);
  assert.equal(getSwipeDirection({ deltaX: -90, deltaY: 80 }), null);
});

test("returns the adjacent prediction stage for each swipe direction", () => {
  assert.equal(
    getAdjacentPredictionStage("/predicciones/grupos", "next"),
    "/predicciones/clasificados"
  );
  assert.equal(
    getAdjacentPredictionStage("/predicciones/eliminatorias?view=cuadro", "previous"),
    "/predicciones/clasificados"
  );
  assert.equal(getAdjacentPredictionStage("/predicciones/grupos", "previous"), null);
  assert.equal(getAdjacentPredictionStage("/predicciones/premios", "next"), null);
});
