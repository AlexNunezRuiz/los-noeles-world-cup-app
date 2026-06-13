import assert from "node:assert/strict";
import test from "node:test";

import { buildRealGroupStandings } from "./group-standings";

const teams = [
  { id: 1, name: "Canada", flag_emoji: "🇨🇦", group_letter: "A" },
  { id: 2, name: "Mexico", flag_emoji: "🇲🇽", group_letter: "A" },
  { id: 3, name: "South Africa", flag_emoji: "🇿🇦", group_letter: "A" },
  { id: 4, name: "Japan", flag_emoji: "🇯🇵", group_letter: "A" },
  { id: 5, name: "Spain", flag_emoji: "🇪🇸", group_letter: "B" },
];

test("builds real group standings from partially played group matches", () => {
  const standings = buildRealGroupStandings(teams, [
    {
      group_letter: "A",
      home_team_id: 1,
      away_team_id: 2,
      home_score: 2,
      away_score: 1,
      is_finished: true,
    },
    {
      group_letter: "A",
      home_team_id: 3,
      away_team_id: 4,
      home_score: 0,
      away_score: 0,
      is_finished: true,
    },
  ]);

  assert.deepEqual(
    standings.get("A")?.map((standing) => ({
      team_id: standing.team_id,
      position: standing.position,
      played: standing.played,
      points: standing.points,
      goal_difference: standing.goal_difference,
    })),
    [
      { team_id: 1, position: 1, played: 1, points: 3, goal_difference: 1 },
      { team_id: 3, position: 2, played: 1, points: 1, goal_difference: 0 },
      { team_id: 4, position: 3, played: 1, points: 1, goal_difference: 0 },
      { team_id: 2, position: 4, played: 1, points: 0, goal_difference: -1 },
    ]
  );
});
