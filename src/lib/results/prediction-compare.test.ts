import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMatchSearchLabel,
  getInitialSelectedMatchId,
  sortProfilesByCurrentRanking,
} from "./prediction-compare";

test("builds match labels with team names for group matches", () => {
  const label = buildMatchSearchLabel({
    match_number: 8,
    stage: "group",
    group_letter: "A",
    homeName: "Canada",
    awayName: "Mexico",
  });

  assert.equal(label, "Canada - Mexico · Grupo A · P08");
});

test("builds useful labels for knockout placeholders", () => {
  const label = buildMatchSearchLabel({
    match_number: 74,
    stage: "round_of_16",
    group_letter: null,
    homeName: "1A",
    awayName: "2B",
  });

  assert.equal(label, "1A - 2B · Octavos · P74");
});

test("selects match from search params when it exists", () => {
  assert.equal(getInitialSelectedMatchId([4, 8, 12], "8"), 8);
  assert.equal(getInitialSelectedMatchId([4, 8, 12], "99"), 4);
  assert.equal(getInitialSelectedMatchId([4, 8, 12], null), 4);
  assert.equal(getInitialSelectedMatchId([], "8"), null);
});

test("sorts paid profiles by current ranking and leaves unpaid profiles after them", () => {
  const profiles = [
    { id: "u1", display_name: "Noe", has_paid: true },
    { id: "u2", display_name: "Ana", has_paid: true },
    { id: "u3", display_name: "Luis", has_paid: false },
    { id: "u4", display_name: "Bea", has_paid: true },
  ];
  const scores = [
    { user_id: "u4", total_points: 6 },
    { user_id: "u1", total_points: 10 },
    { user_id: "u2", total_points: 10 },
  ];

  const sorted = sortProfilesByCurrentRanking(profiles, scores, "u1");

  assert.deepEqual(
    sorted.map((profile) => ({
      id: profile.id,
      rank: profile.rank,
      totalPoints: profile.totalPoints,
      isCurrentUser: profile.isCurrentUser,
    })),
    [
      { id: "u1", rank: 1, totalPoints: 10, isCurrentUser: true },
      { id: "u2", rank: 1, totalPoints: 10, isCurrentUser: false },
      { id: "u4", rank: 3, totalPoints: 6, isCurrentUser: false },
      { id: "u3", rank: null, totalPoints: 0, isCurrentUser: false },
    ]
  );
});
