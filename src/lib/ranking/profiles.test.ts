import assert from "node:assert/strict";
import test from "node:test";

import { fetchRankingProfiles } from "./profiles";

function makeProfilesClient(
  responses: Array<{ data: unknown[] | null; error: unknown }>
) {
  const calls: string[] = [];

  return {
    calls,
    from(table: string) {
      assert.equal(table, "profiles");

      return {
        select(columns: string) {
          calls.push(columns);
          const response = responses.shift();
          assert.ok(response, `Unexpected profiles query for ${columns}`);
          return Promise.resolve(response);
        },
      };
    },
  };
}

test("loads ranking profiles with active status when the column exists", async () => {
  const rows = [
    { id: "u1", display_name: "Noe", has_paid: true, is_active: true },
  ];
  const client = makeProfilesClient([{ data: rows, error: null }]);

  assert.deepEqual(await fetchRankingProfiles(client), rows);
  assert.deepEqual(client.calls, ["id, display_name, has_paid, is_active"]);
});

test("falls back to legacy profile columns when is_active is missing", async () => {
  const legacyRows = [
    { id: "u1", display_name: "Noe", has_paid: true },
    { id: "u2", display_name: "Ana", has_paid: false },
  ];
  const client = makeProfilesClient([
    {
      data: null,
      error: {
        message:
          "Could not find the 'is_active' column of 'profiles' in the schema cache.",
      },
    },
    { data: legacyRows, error: null },
  ]);

  assert.deepEqual(await fetchRankingProfiles(client), legacyRows);
  assert.deepEqual(client.calls, [
    "id, display_name, has_paid, is_active",
    "id, display_name, has_paid",
  ]);
});

test("does not hide non-schema profile query errors", async () => {
  const client = makeProfilesClient([
    { data: null, error: { message: "permission denied for table profiles" } },
  ]);

  await assert.rejects(
    () => fetchRankingProfiles(client),
    /permission denied for table profiles/
  );
});
