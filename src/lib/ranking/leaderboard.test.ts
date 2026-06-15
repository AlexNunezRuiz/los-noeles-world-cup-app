import assert from "node:assert/strict";
import test from "node:test";

import { buildRankingLeaderboard } from "./leaderboard";

const profiles = [
  { id: "u1", display_name: "Noe", has_paid: true, is_active: true },
  { id: "u2", display_name: "Ana", has_paid: true, is_active: true },
  { id: "u3", display_name: "Luis", has_paid: false, is_active: true },
  { id: "u4", display_name: "Bea", has_paid: true, is_active: false },
];

test("builds ranking rows for paid active players even when scores are missing", () => {
  const leaderboard = buildRankingLeaderboard({
    profiles,
    scores: [],
    currentUserId: "u1",
  });

  assert.deepEqual(
    leaderboard.map((entry) => ({
      user_id: entry.user_id,
      position: entry.position,
      total_points: entry.total_points,
      isYou: entry.isYou,
    })),
    [
      { user_id: "u2", position: 1, total_points: 0, isYou: false },
      { user_id: "u1", position: 1, total_points: 0, isYou: true },
    ]
  );
});

test("sorts scored players first and keeps zero point participants in the ranking", () => {
  const leaderboard = buildRankingLeaderboard({
    profiles,
    scores: [
      {
        user_id: "u1",
        total_points: 8,
        group_stage_points: 4,
        knockout_exact_points: 2,
        qualification_points: 2,
        award_points: 0,
      },
    ],
    currentUserId: null,
  });

  assert.deepEqual(
    leaderboard.map((entry) => [entry.user_id, entry.position, entry.total_points]),
    [
      ["u1", 1, 8],
      ["u2", 2, 0],
    ]
  );
});
