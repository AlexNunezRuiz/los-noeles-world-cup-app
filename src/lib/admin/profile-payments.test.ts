import assert from "node:assert/strict";
import test from "node:test";

import { isMissingProfilesColumnError } from "./profile-payments";

test("detecta errores de cache de esquema por columnas ausentes en profiles", () => {
  assert.equal(
    isMissingProfilesColumnError({
      message: "Could not find the 'paid_at' column of 'profiles' in the schema cache.",
    }),
    true
  );
});

test("no confunde otros errores de Supabase con columnas ausentes", () => {
  assert.equal(isMissingProfilesColumnError({ message: "permission denied for table profiles" }), false);
});

