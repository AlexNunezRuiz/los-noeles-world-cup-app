import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePrizeBreakdown,
  parsePrizeDistribution,
  prizeDistributionPercentTotal,
} from "./config";

test("usa la distribucion por defecto y descuenta el farolillo fijo antes de porcentajes", () => {
  const distribution = parsePrizeDistribution(undefined, 5);
  const breakdown = calculatePrizeBreakdown({
    paidCount: 10,
    entryFee: 5,
    distribution,
  });

  assert.equal(breakdown.total, 50);
  assert.equal(breakdown.items.find((item) => item.key === "last_place")?.amount, 5);
  assert.equal(breakdown.items.find((item) => item.key === "first")?.amount, 27);
  assert.equal(breakdown.items.find((item) => item.key === "second")?.amount, 11);
  assert.equal(breakdown.items.find((item) => item.key === "third")?.amount, 4);
  assert.equal(breakdown.items.find((item) => item.key === "group_champion")?.amount, 2);
});

test("lee porcentajes configurados y desactiva premios", () => {
  const distribution = parsePrizeDistribution(
    JSON.stringify([
      { key: "first", label: "Ganador", recipient: "ranking_1", type: "percentage", value: 70, active: true },
      { key: "second", label: "Segundo", recipient: "ranking_2", type: "percentage", value: 30, active: true },
      { key: "third", label: "Tercero", recipient: "ranking_3", type: "percentage", value: 10, active: false },
    ]),
    5
  );

  assert.equal(distribution.length, 2);
  assert.equal(prizeDistributionPercentTotal(distribution), 100);
  assert.equal(distribution[0].label, "Ganador");
});
