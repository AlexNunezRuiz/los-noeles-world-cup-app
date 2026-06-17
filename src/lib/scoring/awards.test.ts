import assert from "node:assert/strict";
import test from "node:test";

import { scoreAwards } from "./awards";

function fakeSupabase(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      return {
        select() {
          return Promise.resolve({ data: tables[table] ?? [] });
        },
      };
    },
  };
}

test("los puntos por premios no apuntan a un partido inexistente", async () => {
  const events = await scoreAwards(
    fakeSupabase({
      actual_awards: [{ award_type: "golden_boot", player_id: 9, player_name: "Noe" }],
      award_predictions: [{ user_id: "u1", award_type: "golden_boot", player_id: 9 }],
    }) as never,
    new Map([["golden_boot", 10]])
  );

  assert.equal(events[0]?.match_id, null);
});
