import assert from "node:assert/strict";
import test from "node:test";

import { scoreGroupPositions } from "./group-stage";

function fakeSupabase(rows: unknown[]) {
  return {
    from(table: string) {
      assert.equal(table, "predicted_group_standings");

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        then<TResult1 = { data: unknown[] }, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown[] }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
        ) {
          return Promise.resolve({ data: rows }).then(onfulfilled, onrejected);
        },
      };
    },
  };
}

test("los puntos por clasificacion de grupo no apuntan a un partido inexistente", async () => {
  const events = await scoreGroupPositions(
    fakeSupabase([{ user_id: "u1", team_id: 10, position: 1 }]) as never,
    "A",
    [{ team_id: 10, position: 1 }],
    new Map([["group_pos_1st", 1]])
  );

  assert.equal(events[0]?.match_id, null);
});
