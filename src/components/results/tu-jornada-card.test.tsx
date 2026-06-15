import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TuJornadaCard } from "./tu-jornada-card";

test("renders boletin entries as links to their scored match", () => {
  const html = renderToStaticMarkup(
    <TuJornadaCard
      jornada={1}
      puntos={3}
      posicion={2}
      movimiento={0}
      boletin={[
        { tipo: "exacto", puntos: 2, matchId: 8, matchNumber: 8 },
        { tipo: "signo", puntos: 1, matchId: 9, matchNumber: 9 },
      ]}
    />
  );

  assert.match(html, /href="\/resultados\/predicciones\?partido=8"/);
  assert.match(html, /href="\/resultados\/predicciones\?partido=9"/);
  assert.match(html, /aria-label="Ver partido P08: exacto, \+2 puntos"/);
  assert.match(html, /aria-label="Ver partido P09: signo, \+1 punto"/);
});
