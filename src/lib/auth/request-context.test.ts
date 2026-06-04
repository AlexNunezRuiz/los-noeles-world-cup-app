import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_CONTEXT_IS_ADMIN_HEADER,
  AUTH_CONTEXT_USER_ID_HEADER,
  readAuthContext,
} from "./request-context";

test("lee usuario y estado admin desde headers internos", () => {
  const headers = new Headers({
    [AUTH_CONTEXT_USER_ID_HEADER]: "user-1",
    [AUTH_CONTEXT_IS_ADMIN_HEADER]: "true",
  });

  assert.deepEqual(readAuthContext(headers), {
    userId: "user-1",
    isAdmin: true,
  });
});

test("trata headers ausentes como contexto desconocido", () => {
  assert.deepEqual(readAuthContext(new Headers()), {
    userId: null,
    isAdmin: false,
  });
});
