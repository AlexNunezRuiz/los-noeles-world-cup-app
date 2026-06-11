import assert from "node:assert/strict";
import test from "node:test";

import { recalculateAllScores } from "./calculator";

type QueryResult = { data: unknown; error: { message: string } | null };

class FakeQuery {
  private operation = "select";
  private table: string;
  private responses: Map<string, QueryResult>;
  private calls: string[];

  constructor(
    table: string,
    responses: Map<string, QueryResult>,
    calls: string[]
  ) {
    this.table = table;
    this.responses = responses;
    this.calls = calls;
  }

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
    this.calls.push(key);
    const result = this.responses.get(key) ?? { data: [], error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function fakeSupabase(responses: Map<string, QueryResult>) {
  const calls: string[] = [];
  return {
    calls,
    from(table: string) {
      return new FakeQuery(table, responses, calls);
    },
  };
}

test("recalculateAllScores avoids mass clearing score tables by default", async () => {
  const supabase = fakeSupabase(
    new Map([
      ["scoring_rules:select", { data: [], error: null }],
      ["profiles:select", { data: [], error: null }],
    ])
  );

  const result = await recalculateAllScores(supabase as never);

  assert.equal(result.success, true);
  assert.ok(!supabase.calls.includes("score_events:delete"));
  assert.ok(!supabase.calls.includes("user_scores:delete"));
  assert.ok(!supabase.calls.includes("score_events:insert"));
});
