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
