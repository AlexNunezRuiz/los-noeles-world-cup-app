import assert from "node:assert/strict";
import test from "node:test";

import { sortAdminUsers, type AdminUserSortKey } from "./user-sort";

const users = [
  {
    display_name: "Carlos",
    email: "carlos@example.com",
    has_paid: false,
    is_admin: false,
    is_chat_banned: true,
    created_at: "2026-01-03T10:00:00.000Z",
    paid_at: null,
    last_prediction_updated_at: null,
    porra_pct: 20,
  },
  {
    display_name: "Ana",
    email: "ana@example.com",
    has_paid: true,
    is_admin: false,
    is_chat_banned: false,
    created_at: "2026-01-01T10:00:00.000Z",
    paid_at: "2026-01-05T10:00:00.000Z",
    last_prediction_updated_at: "2026-01-06T10:00:00.000Z",
    porra_pct: 90,
  },
  {
    display_name: "Bea",
    email: "bea@example.com",
    has_paid: true,
    is_admin: true,
    is_chat_banned: false,
    created_at: "2026-01-02T10:00:00.000Z",
    paid_at: "2026-01-04T10:00:00.000Z",
    last_prediction_updated_at: "2026-01-04T10:00:00.000Z",
    porra_pct: 60,
  },
];

function namesFor(key: AdminUserSortKey, direction: "asc" | "desc") {
  return sortAdminUsers(users, { key, direction }).map((user) => user.display_name);
}

test("ordena usuarios por texto de forma ascendente y descendente", () => {
  assert.deepEqual(namesFor("display_name", "asc"), ["Ana", "Bea", "Carlos"]);
  assert.deepEqual(namesFor("email", "desc"), ["Carlos", "Bea", "Ana"]);
});

test("ordena usuarios por booleanos colocando true primero en descendente", () => {
  assert.deepEqual(namesFor("has_paid", "desc"), ["Ana", "Bea", "Carlos"]);
  assert.deepEqual(namesFor("is_chat_banned", "desc"), ["Carlos", "Ana", "Bea"]);
});

test("ordena usuarios por ultima actividad con usuarios sin actividad al final", () => {
  assert.deepEqual(namesFor("last_prediction_updated_at", "desc"), ["Ana", "Bea", "Carlos"]);
  assert.deepEqual(namesFor("last_prediction_updated_at", "asc"), ["Bea", "Ana", "Carlos"]);
});

test("ordena usuarios por fechas y numeros", () => {
  assert.deepEqual(namesFor("created_at", "asc"), ["Ana", "Bea", "Carlos"]);
  assert.deepEqual(namesFor("paid_at", "desc"), ["Ana", "Bea", "Carlos"]);
  assert.deepEqual(namesFor("porra_pct", "asc"), ["Carlos", "Bea", "Ana"]);
});
