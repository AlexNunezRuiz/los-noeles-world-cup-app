import assert from "node:assert/strict";
import test from "node:test";

import { allocateThirdPlaces } from "./third-place-allocation";

test("asigna los terceros por grupo según la tabla oficial FIFA 2026", () => {
  // Combinación real de los 8 mejores terceros: B,D,E,F,I,J,K,L.
  const alloc = allocateThirdPlaces(["B", "D", "E", "F", "I", "J", "K", "L"]);
  assert.ok(alloc);
  // Caso conocido: el ganador del grupo E (Alemania) se enfrenta al 3º del grupo D (Paraguay).
  assert.equal(alloc!["E"], "D");
  // Resto de la combinación, verificado contra las fuentes oficiales.
  assert.deepEqual(alloc, { A: "E", B: "J", D: "B", E: "D", G: "I", I: "F", K: "L", L: "K" });
});

test("el orden de entrada no importa (se normaliza)", () => {
  const a = allocateThirdPlaces(["L", "K", "J", "I", "F", "E", "D", "B"]);
  const b = allocateThirdPlaces(["B", "D", "E", "F", "I", "J", "K", "L"]);
  assert.deepEqual(a, b);
});

test("devuelve null si no hay exactamente 8 grupos", () => {
  assert.equal(allocateThirdPlaces(["A", "B", "C"]), null);
  assert.equal(allocateThirdPlaces([]), null);
});
