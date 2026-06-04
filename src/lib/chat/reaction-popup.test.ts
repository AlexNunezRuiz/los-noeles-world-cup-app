import assert from "node:assert/strict";
import test from "node:test";

import { isOutsideReactionPopup } from "./reaction-popup";

class FakeNode {
  constructor(private readonly children: unknown[] = []) {}

  contains(target: unknown) {
    return this === target || this.children.includes(target);
  }
}

test("detecta clics fuera del popup de reacciones", () => {
  const inside = new FakeNode();
  const popup = new FakeNode([inside]);
  const outside = new FakeNode();

  assert.equal(isOutsideReactionPopup(popup as unknown as HTMLElement, inside as unknown as EventTarget), false);
  assert.equal(isOutsideReactionPopup(popup as unknown as HTMLElement, popup as unknown as EventTarget), false);
  assert.equal(isOutsideReactionPopup(popup as unknown as HTMLElement, outside as unknown as EventTarget), true);
});

test("no cierra si aun no existe el contenedor o el target no es valido", () => {
  const outside = new FakeNode();

  assert.equal(isOutsideReactionPopup(null, outside as unknown as EventTarget), false);
  assert.equal(isOutsideReactionPopup(outside as unknown as HTMLElement, null), false);
}
);
