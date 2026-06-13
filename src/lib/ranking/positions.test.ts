import assert from "node:assert/strict";
import test from "node:test";

import { assignCompetitionPositions } from "./positions";

test("mantiene la misma posicion para usuarios empatados y salta al siguiente puesto real", () => {
  const ranked = assignCompetitionPositions(
    [
      { user_id: "a", total_points: 10 },
      { user_id: "b", total_points: 10 },
      { user_id: "c", total_points: 10 },
      { user_id: "d", total_points: 8 },
      { user_id: "e", total_points: 6 },
      { user_id: "f", total_points: 6 },
      { user_id: "g", total_points: 5 },
    ],
    (entry) => entry.total_points
  );

  assert.deepEqual(
    ranked.map((entry) => [entry.user_id, entry.position]),
    [
      ["a", 1],
      ["b", 1],
      ["c", 1],
      ["d", 4],
      ["e", 5],
      ["f", 5],
      ["g", 7],
    ]
  );
});

test("no muta las filas originales al asignar posiciones", () => {
  const entries = [
    { user_id: "a", total_points: 2, position: 99 },
    { user_id: "b", total_points: 1, position: 99 },
  ];

  const ranked = assignCompetitionPositions(entries, (entry) => entry.total_points);

  assert.deepEqual(entries.map((entry) => entry.position), [99, 99]);
  assert.deepEqual(ranked.map((entry) => entry.position), [1, 2]);
});
