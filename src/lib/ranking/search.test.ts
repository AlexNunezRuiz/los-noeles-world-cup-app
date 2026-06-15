import assert from "node:assert/strict";
import test from "node:test";

import {
  filterRankingSearchTargets,
  getRankingSearchSuggestions,
  type RankingSearchTarget,
} from "./search";

const targets: RankingSearchTarget[] = [
  {
    id: "u1",
    displayName: "Noe Garcia",
    hasPaid: true,
    position: 2,
    totalPoints: 14,
    isCurrentUser: true,
  },
  {
    id: "u2",
    displayName: "Maria Lopez",
    hasPaid: true,
    position: 1,
    totalPoints: 18,
    isCurrentUser: false,
  },
  {
    id: "u3",
    displayName: "Luis Perez",
    hasPaid: false,
    position: null,
    totalPoints: 0,
    isCurrentUser: false,
  },
];

test("filters ranking search targets by partial player name as the user types", () => {
  assert.deepEqual(
    filterRankingSearchTargets(targets, "gar").map((target) => target.id),
    ["u1"]
  );
  assert.deepEqual(
    filterRankingSearchTargets(targets, "mar lo").map((target) => target.id),
    ["u2"]
  );
});

test("builds autocomplete suggestions with ranked and pending players", () => {
  assert.deepEqual(getRankingSearchSuggestions(targets, "pend", 5), [
    { id: "u3", value: "Luis Perez", label: "Luis Perez - Pendiente pago" },
  ]);

  assert.deepEqual(getRankingSearchSuggestions(targets, "#1", 5), [
    { id: "u2", value: "Maria Lopez", label: "Maria Lopez - #1 - 18 pts" },
  ]);
});
