import assert from "node:assert/strict";
import test from "node:test";

import { copyTextToClipboard } from "./clipboard";

test("copia texto usando la API de portapapeles disponible", async () => {
  const writes: string[] = [];

  const copied = await copyTextToClipboard("ES12 3456 7890", {
    writeText: async (text) => {
      writes.push(text);
    },
  });

  assert.equal(copied, true);
  assert.deepEqual(writes, ["ES12 3456 7890"]);
});

test("devuelve false si el navegador no permite copiar", async () => {
  const copied = await copyTextToClipboard("ES12 3456 7890", undefined);

  assert.equal(copied, false);
});
