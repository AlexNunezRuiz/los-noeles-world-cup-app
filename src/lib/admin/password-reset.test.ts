import assert from "node:assert/strict";
import test from "node:test";

import {
  MANUAL_PASSWORD_MIN_LENGTH,
  resetUserPasswordManually,
} from "./password-reset";

test("rejects short manual reset passwords before calling Supabase", async () => {
  let called = false;

  const result = await resetUserPasswordManually({
    actorIsAdmin: true,
    actorUserId: "admin-1",
    targetUserId: "user-1",
    password: "short",
    updateUserPassword: async () => {
      called = true;
      return { error: null };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.match(result.error, new RegExp(`${MANUAL_PASSWORD_MIN_LENGTH}`));
  assert.equal(called, false);
});

test("rejects non-admin manual password resets", async () => {
  let called = false;

  const result = await resetUserPasswordManually({
    actorIsAdmin: false,
    actorUserId: "user-2",
    targetUserId: "user-1",
    password: "temporal123",
    updateUserPassword: async () => {
      called = true;
      return { error: null };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(called, false);
});

test("updates the requested auth user when the actor is admin", async () => {
  const calls: Array<{ userId: string; password: string }> = [];

  const result = await resetUserPasswordManually({
    actorIsAdmin: true,
    actorUserId: "admin-1",
    targetUserId: "user-1",
    password: "temporal123",
    updateUserPassword: async (userId, password) => {
      calls.push({ userId, password });
      return { error: null };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [{ userId: "user-1", password: "temporal123" }]);
});
