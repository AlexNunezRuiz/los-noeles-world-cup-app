import assert from "node:assert/strict";
import test from "node:test";

import { auditGroupMatches, auditGroupOrder, auditQualified, type AuditMatch } from "./points-audit";

function gm(partial: Partial<AuditMatch> & { match_id: number }): AuditMatch {
  return {
    match_number: partial.match_id,
    stage: "group",
    group_letter: "A",
    home_team_id: 1,
    away_team_id: 2,
    home_score: null,
    away_score: null,
    is_finished: true,
    ...partial,
  };
}

test("auditGroupMatches scores signo and exacto", () => {
  const matches: AuditMatch[] = [
    gm({ match_id: 1, home_score: 2, away_score: 0 }), // pred 2-0 -> exacto
    gm({ match_id: 2, home_score: 1, away_score: 1 }), // pred 0-2 -> miss
    gm({ match_id: 3, home_score: 3, away_score: 1 }), // pred 2-1 -> signo only
    gm({ match_id: 4, home_score: 0, away_score: 0, is_finished: false }), // not finished -> ignored
  ];
  const preds = new Map([
    [1, { match_id: 1, home_score: 2, away_score: 0 }],
    [2, { match_id: 2, home_score: 0, away_score: 2 }],
    [3, { match_id: 3, home_score: 2, away_score: 1 }],
    [4, { match_id: 4, home_score: 0, away_score: 0 }],
  ]);
  const { rows, signTotal, exactTotal } = auditGroupMatches(matches, preds, 1, 1);
  assert.equal(rows.length, 3);
  assert.equal(signTotal, 2); // matches 1 and 3
  assert.equal(exactTotal, 1); // match 1
  assert.deepEqual(
    rows.map((r) => [r.signOk, r.exactOk, r.points]),
    [[true, true, 2], [false, false, 0], [true, false, 1]]
  );
});

test("auditGroupOrder compares predicted vs actual positions", () => {
  const actual = new Map([
    ["A", [
      { team_id: 10, position: 1 },
      { team_id: 11, position: 2 },
      { team_id: 12, position: 3 },
      { team_id: 13, position: 4 },
    ]],
    ["B", [{ team_id: 20, position: 1 }]],
  ]);
  const predicted = new Map([
    ["A", new Map([[10, 1], [11, 3], [12, 3], [13, 4]])], // 1st ok, 3rd ok, 4th ok; 2nd wrong
  ]);
  const { groups, total } = auditGroupOrder(actual, predicted, { 1: 1, 2: 1, 3: 2, 4: 2 });
  assert.equal(groups.length, 1); // B not predicted -> skipped
  assert.equal(groups[0].points, 5); // 1 (pos1) + 2 (pos3) + 2 (pos4)
  assert.equal(total, 5);
});

test("auditQualified counts predicted teams that really qualified", () => {
  const { rows, hits, total } = auditQualified([1, 2, 3, 2], new Set([1, 3, 9]), 1);
  assert.equal(rows.length, 3); // dedup
  assert.equal(hits, 2); // 1 and 3
  assert.equal(total, 2);
});
