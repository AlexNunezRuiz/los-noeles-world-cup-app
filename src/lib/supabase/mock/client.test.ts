import assert from "node:assert/strict";
import test from "node:test";

import { createMockClient } from "./client";

test("supports Supabase is null filters in mock queries", async () => {
  const supabase = createMockClient();
  const userId = "mock-is-filter-user";

  await supabase.from("notifications").insert([
    { user_id: userId, read_at: null },
    { user_id: userId, read_at: "2026-01-01T00:00:00Z" },
    { user_id: "other-user", read_at: null },
  ]);

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  assert.equal(error, null);
  assert.equal(count, 1);
});
