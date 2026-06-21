# Manual Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a temporary admin-only way to set a user's password without sending Supabase recovery emails.

**Architecture:** Keep the privileged operation behind a Next.js route handler that runs server-side only and reads `SUPABASE_SERVICE_ROLE_KEY` from the environment. Put validation and authorization in a small helper with node tests, then call the route from the existing admin users table.

**Tech Stack:** Next.js App Router, React client components, Supabase Auth admin API, `node:test` through `npx tsx --test`, Tailwind UI.

---

### Task 1: Tested Password Reset Helper

**Files:**
- Create: `src/lib/admin/password-reset.test.ts`
- Create: `src/lib/admin/password-reset.ts`

- [x] **Step 1: Write the failing test**

```ts
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/admin/password-reset.test.ts`

Expected: FAIL because `src/lib/admin/password-reset.ts` does not exist yet.

- [x] **Step 3: Write minimal implementation**

Create `src/lib/admin/password-reset.ts` with:

```ts
export const MANUAL_PASSWORD_MIN_LENGTH = 8;

type ManualPasswordResetSuccess = { ok: true };
type ManualPasswordResetFailure = { ok: false; status: number; error: string };

export type ManualPasswordResetResult =
  | ManualPasswordResetSuccess
  | ManualPasswordResetFailure;

export type UpdateUserPassword = (
  userId: string,
  password: string
) => Promise<{ error: { message?: string } | null }>;

export async function resetUserPasswordManually({
  actorIsAdmin,
  actorUserId,
  targetUserId,
  password,
  updateUserPassword,
}: {
  actorIsAdmin: boolean;
  actorUserId: string | null | undefined;
  targetUserId: string | null | undefined;
  password: string;
  updateUserPassword: UpdateUserPassword;
}): Promise<ManualPasswordResetResult> {
  const cleanTargetUserId = targetUserId?.trim();

  if (!actorUserId) {
    return { ok: false, status: 401, error: "Sesion no valida." };
  }

  if (!actorIsAdmin) {
    return { ok: false, status: 403, error: "Solo un administrador puede cambiar contrasenas." };
  }

  if (!cleanTargetUserId) {
    return { ok: false, status: 400, error: "Falta el usuario." };
  }

  if (password.length < MANUAL_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `La contrasena temporal debe tener al menos ${MANUAL_PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  const { error } = await updateUserPassword(cleanTargetUserId, password);
  if (error) {
    return {
      ok: false,
      status: 502,
      error: error.message ? `Supabase no pudo cambiar la contrasena: ${error.message}` : "Supabase no pudo cambiar la contrasena.",
    };
  }

  return { ok: true };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/admin/password-reset.test.ts`

Expected: PASS.

### Task 2: Admin API Route

**Files:**
- Create: `src/app/api/admin/users/[userId]/password/route.ts`

- [x] **Step 1: Add a server-only route handler**

Create a POST handler that:
- Reads `{ password }` from JSON.
- Authenticates the current user with `src/lib/supabase/server`.
- Reads the current user's `profiles.is_admin`.
- Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Calls `supabase.auth.admin.updateUserById(userId, { password })`.
- Returns JSON errors with the helper's status codes.

- [x] **Step 2: Verify type safety**

Run: `npx tsc --noEmit`

Expected: PASS.

### Task 3: Admin Users UI

**Files:**
- Modify: `src/app/(admin)/admin/usuarios/page.tsx`

- [x] **Step 1: Add per-user temporary password state**

Track a password draft and loading state by user id.

- [x] **Step 2: Add the reset control to each user row**

Add a "Clave" column with an input and `Cambiar` button. The button posts to `/api/admin/users/{id}/password`, clears the input on success, and shows toasts for success or failure.

- [x] **Step 3: Run verification**

Run:

```bash
npx tsx --test src/lib/admin/password-reset.test.ts
npx tsc --noEmit
```

Expected: both pass.

### Task 4: Commit and Push

**Files:**
- Add only files from this feature.

- [x] **Step 1: Review diff**

Run: `git diff -- src/lib/admin/password-reset.ts src/lib/admin/password-reset.test.ts "src/app/api/admin/users/[userId]/password/route.ts" "src/app/(admin)/admin/usuarios/page.tsx" docs/superpowers/plans/2026-06-21-manual-password-reset.md`

- [ ] **Step 2: Commit**

Run:

```bash
git add src/lib/admin/password-reset.ts src/lib/admin/password-reset.test.ts "src/app/api/admin/users/[userId]/password/route.ts" "src/app/(admin)/admin/usuarios/page.tsx" docs/superpowers/plans/2026-06-21-manual-password-reset.md
git commit -m "feat(admin): add manual password reset"
```

- [ ] **Step 3: Push**

Run: `git push origin main`

Expected: push succeeds.
