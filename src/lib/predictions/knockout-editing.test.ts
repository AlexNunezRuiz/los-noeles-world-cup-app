import assert from "node:assert/strict";
import test from "node:test";

import {
  getKnockoutEditingViewState,
  type KnockoutEditingState,
} from "./knockout-editing";

test("permite reabrir el teclado al tocar un marcador de una eliminatoria empatada", () => {
  const state: KnockoutEditingState = {
    editing: { matchNum: 73, side: "home" },
    awaitingWinnerMatch: 73,
  };

  const view = getKnockoutEditingViewState(state, 73);

  assert.equal(view.selected, true);
  assert.equal(view.focusedSide, "home");
  assert.equal(view.scorePadOpen, true);
});

test("mantiene seleccionada una eliminatoria empatada pendiente de ganador sin abrir teclado", () => {
  const state: KnockoutEditingState = {
    editing: null,
    awaitingWinnerMatch: 73,
  };

  const view = getKnockoutEditingViewState(state, 73);

  assert.equal(view.selected, true);
  assert.equal(view.focusedSide, null);
  assert.equal(view.scorePadOpen, false);
});

test("mantiene seleccionada una eliminatoria empatada sin ganador aunque venga de datos guardados", () => {
  const state: KnockoutEditingState = {
    editing: null,
    awaitingWinnerMatch: null,
  };

  const view = getKnockoutEditingViewState(state, 73, true);

  assert.equal(view.selected, true);
  assert.equal(view.focusedSide, null);
  assert.equal(view.scorePadOpen, false);
});
