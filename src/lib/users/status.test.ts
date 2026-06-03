import assert from "node:assert/strict";
import test from "node:test";

import { getUserStatus, getUserStatusLabel } from "./status";

test("prioriza admin sobre el estado de pago", () => {
  assert.equal(getUserStatus({ is_admin: true, has_paid: false }), "admin");
  assert.equal(getUserStatus({ is_admin: true, has_paid: true }), "admin");
});

test("distingue pagados y no pagados cuando no son admin", () => {
  assert.equal(getUserStatus({ is_admin: false, has_paid: true }), "paid");
  assert.equal(getUserStatus({ is_admin: false, has_paid: false }), "unpaid");
  assert.equal(getUserStatus(null), "unpaid");
});

test("devuelve etiquetas visibles para cada estado", () => {
  assert.equal(getUserStatusLabel("admin"), "Admin");
  assert.equal(getUserStatusLabel("paid"), "Pagado");
  assert.equal(getUserStatusLabel("unpaid"), "No pagado");
});
