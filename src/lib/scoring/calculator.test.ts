import assert from "node:assert/strict";
import test from "node:test";

import { recalculateAllScores } from "./calculator";

type QueryResult = { data: unknown; error: { message: string } | null };

class FakeQuery {
  private operation = "select";

  constructor(
    private table: string,
    private responses: Map<string, QueryResult>,
    private calls?: string[]
  ) {}

  select() {
    this.operation = "select";
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  insert() {
    this.operation = "insert";
    return this;
  }

  upsert() {
    this.operation = "upsert";
    return this;
  }

  neq() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  range() {
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    const key = `${this.table}:${this.operation}`;
    this.calls?.push(key);
    const result = this.responses.get(key) ?? { data: [], error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

class TableQuery {
  private operation = "select";
  private filters: Array<(row: Record<string, unknown>) => boolean> = [];
  private payload: unknown;

  constructor(private table: string, private tables: Record<string, Array<Record<string, unknown>>>) {}

  select() {
    this.operation = "select";
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  insert(rows: unknown) {
    this.operation = "insert";
    this.payload = rows;
    return this;
  }

  upsert(rows: unknown) {
    this.operation = "upsert";
    this.payload = rows;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  order() {
    return this;
  }

  range() {
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    const rows = this.tables[this.table] ?? [];
    const selectedRows = rows.filter((row) => this.filters.every((filter) => filter(row)));

    if (this.operation === "delete") {
      this.tables[this.table] = rows.filter((row) => !this.filters.every((filter) => filter(row)));
      return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
    }

    if (this.operation === "insert" || this.operation === "upsert") {
      const incoming = Array.isArray(this.payload) ? this.payload : [this.payload];
      this.tables[this.table] = [...rows, ...(incoming as Array<Record<string, unknown>>)];
      return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
    }

    return Promise.resolve({ data: selectedRows, error: null }).then(onfulfilled, onrejected);
  }
}

function fakeSupabase(responses: Map<string, QueryResult>) {
  return {
    from(table: string) {
      return new FakeQuery(table, responses);
    },
  };
}

test("recalculateAllScores fails when Supabase rejects clearing score events", async () => {
  const supabase = fakeSupabase(
    new Map([
      ["scoring_rules:select", { data: [], error: null }],
      ["score_events:delete", { data: null, error: { message: "RLS denied delete" } }],
    ])
  );

  const result = await recalculateAllScores(supabase as never);

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /RLS denied delete/);
});

test("recalculateAllScores keeps cached ranking when scoring inputs fail to load", async () => {
  const operations: string[] = [];
  const responses = new Map([
    ["scoring_rules:select", { data: [], error: null }],
    ["matches:select", { data: [], error: null }],
    ["predicted_group_standings:select", { data: [], error: null }],
    [
      "predicted_best_third_order:select",
      { data: null, error: { message: "relation does not exist" } },
    ],
    ["match_predictions:select", { data: [], error: null }],
    ["knockout_bracket_positions:select", { data: [], error: null }],
    ["score_events:delete", { data: null, error: null }],
    ["user_scores:delete", { data: null, error: null }],
  ]);
  const supabase = {
    from(table: string) {
      return new FakeQuery(table, responses, operations);
    },
  };

  const result = await recalculateAllScores(supabase as never);

  assert.equal(result.success, false);
  assert.match(result.error ?? "", /relation does not exist/);
  assert.equal(operations.includes("user_scores:delete"), false);
});

test("recalculateAllScores usa desempate directo para puntuar posiciones de grupo", async () => {
  const userId = "u1";
  const tables: Record<string, Array<Record<string, unknown>>> = {
    scoring_rules: [
      { category: "group_stage", rule_key: "group_pos_2nd", points: 1 },
    ],
    matches: [
      { id: 1, match_number: 1, stage: "group", group_letter: "A", home_team_id: 1, away_team_id: 2, home_score: 0, away_score: 1, is_finished: true },
      { id: 2, match_number: 2, stage: "group", group_letter: "A", home_team_id: 1, away_team_id: 3, home_score: 1, away_score: 0, is_finished: true },
      { id: 3, match_number: 3, stage: "group", group_letter: "A", home_team_id: 1, away_team_id: 4, home_score: 0, away_score: 0, is_finished: true },
      { id: 4, match_number: 4, stage: "group", group_letter: "A", home_team_id: 2, away_team_id: 3, home_score: 0, away_score: 0, is_finished: true },
      { id: 5, match_number: 5, stage: "group", group_letter: "A", home_team_id: 2, away_team_id: 4, home_score: 0, away_score: 1, is_finished: true },
      { id: 6, match_number: 6, stage: "group", group_letter: "A", home_team_id: 3, away_team_id: 4, home_score: 0, away_score: 0, is_finished: true },
    ],
    predicted_group_standings: [
      { user_id: userId, group_letter: "A", team_id: 4, position: 1 },
      { user_id: userId, group_letter: "A", team_id: 2, position: 2 },
      { user_id: userId, group_letter: "A", team_id: 1, position: 3 },
      { user_id: userId, group_letter: "A", team_id: 3, position: 4 },
    ],
    predicted_best_third_order: [],
    match_predictions: [],
    knockout_bracket_positions: [],
    profiles: [{ id: userId }],
    user_scores: [],
    score_events: [],
  };
  const supabase = {
    from(table: string) {
      return new TableQuery(table, tables);
    },
  };

  const result = await recalculateAllScores(supabase as never);

  assert.equal(result.success, true);
  assert.deepEqual(
    result.events?.filter((event) => event.rule_key === "group_pos_2nd").map((event) => event.user_id),
    [userId]
  );
});

test("recalculateAllScores contabiliza dieciseisavos dentro de puntos de fase de grupos", async () => {
  const userId = "u1";
  const roundOf32Matches = Array.from({ length: 16 }, (_, index) => ({
    id: 73 + index,
    match_number: 73 + index,
    stage: "round_of_32",
    group_letter: null,
    home_team_id: index === 0 ? 2 : 100 + index * 2,
    away_team_id: index === 0 ? 6 : 101 + index * 2,
    home_score: null,
    away_score: null,
    penalty_winner_team_id: null,
    is_finished: false,
  }));
  const tables: Record<string, Array<Record<string, unknown>>> = {
    scoring_rules: [
      { category: "qualification", rule_key: "qualify_r32", points: 1 },
    ],
    matches: roundOf32Matches,
    predicted_group_standings: [
      { user_id: userId, group_letter: "A", team_id: 1, position: 1, points: 7, goals_for: 4, goals_against: 1, goal_difference: 3 },
      { user_id: userId, group_letter: "A", team_id: 2, position: 2, points: 5, goals_for: 3, goals_against: 2, goal_difference: 1 },
      { user_id: userId, group_letter: "A", team_id: 3, position: 3, points: 4, goals_for: 2, goals_against: 2, goal_difference: 0 },
      { user_id: userId, group_letter: "A", team_id: 4, position: 4, points: 0, goals_for: 1, goals_against: 5, goal_difference: -4 },
      { user_id: userId, group_letter: "B", team_id: 5, position: 1, points: 7, goals_for: 4, goals_against: 1, goal_difference: 3 },
      { user_id: userId, group_letter: "B", team_id: 6, position: 2, points: 5, goals_for: 3, goals_against: 2, goal_difference: 1 },
      { user_id: userId, group_letter: "B", team_id: 7, position: 3, points: 4, goals_for: 2, goals_against: 2, goal_difference: 0 },
      { user_id: userId, group_letter: "B", team_id: 8, position: 4, points: 0, goals_for: 1, goals_against: 5, goal_difference: -4 },
    ],
    predicted_best_third_order: [],
    match_predictions: [],
    knockout_bracket_positions: [
      { match_number: 73, slot: "home", source_type: "group_runner_up", source_group: "A" },
      { match_number: 73, slot: "away", source_type: "group_runner_up", source_group: "B" },
    ],
    profiles: [{ id: userId }],
    user_scores: [],
    score_events: [],
  };
  const supabase = {
    from(table: string) {
      return new TableQuery(table, tables);
    },
  };

  const result = await recalculateAllScores(supabase as never);

  assert.equal(result.success, true);
  assert.equal(tables.user_scores[0].total_points, 2);
  assert.equal(tables.user_scores[0].group_stage_points, 2);
  assert.equal(tables.user_scores[0].qualification_points, 0);
});
