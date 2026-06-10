import assert from "node:assert/strict";
import test from "node:test";

import { filterAdminUsers } from "./user-search";

const users = [
  {
    display_name: "Noe Garcia",
    email: "noe@example.com",
    has_paid: true,
    is_admin: true,
    is_chat_banned: false,
  },
  {
    display_name: "María López",
    email: "maria@example.com",
    has_paid: false,
    is_admin: false,
    is_chat_banned: true,
  },
];

test("filtra usuarios por nombre o email ignorando mayusculas y acentos", () => {
  assert.deepEqual(filterAdminUsers(users, "maria").map((user) => user.email), ["maria@example.com"]);
  assert.deepEqual(filterAdminUsers(users, "NOE").map((user) => user.email), ["noe@example.com"]);
});

test("filtra usuarios por estado administrativo y de pago", () => {
  assert.deepEqual(filterAdminUsers(users, "admin pagado").map((user) => user.email), ["noe@example.com"]);
  assert.deepEqual(filterAdminUsers(users, "pendiente ban").map((user) => user.email), ["maria@example.com"]);
});
