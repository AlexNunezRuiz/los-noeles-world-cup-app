import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNotificationInsertSucceeded,
  buildNotificationRows,
  scoreEventsForAwardNotifications,
  scoreEventsForMatchNotifications,
} from "./internal";

test("construye notificaciones para todos salvo excluidos", () => {
  const rows = buildNotificationRows({
    profiles: [{ id: "u1" }, { id: "u2" }, { id: "admin" }],
    excludeUserIds: new Set(["admin"]),
    type: "payment_update",
    actorUserId: "admin",
    title: "Pago confirmado",
    body: "Tu pago ha sido marcado como recibido.",
    link: "/mi-cuenta",
  });

  assert.deepEqual(rows.map((row) => row.user_id), ["u1", "u2"]);
  assert.equal(rows[0].type, "payment_update");
  assert.equal(rows[0].actor_user_id, "admin");
  assert.equal(rows[0].title, "Pago confirmado");
  assert.equal(rows[0].link, "/mi-cuenta");
});

test("notifica cualquier puntuacion positiva de un partido", () => {
  const events = scoreEventsForMatchNotifications(
    [
      { user_id: "u1", match_id: 7, points: 3, rule_key: "correct_sign", description: "Signo" },
      { user_id: "u1", match_id: 7, points: 1, rule_key: "exact_score", description: "Exacto" },
      { user_id: "u2", match_id: 7, points: 0, rule_key: "correct_sign", description: "Nada" },
      { user_id: "u3", match_id: 8, points: 3, rule_key: "correct_sign", description: "Otro" },
      { user_id: "u4", match_id: 7, points: 4, rule_key: "qualify_r16", description: "Clasifica" },
      { user_id: "u5", match_id: null, points: 5, rule_key: "golden_boot", description: "Premio" },
    ],
    7
  );

  assert.deepEqual(events.map((event) => event.user_id), ["u1", "u4"]);
  assert.equal(events[0].points, 4);
  assert.equal(events[1].points, 4);
});

test("agrupa puntuaciones positivas de premios", () => {
  const events = scoreEventsForAwardNotifications([
    { user_id: "u1", match_id: null, points: 5, rule_key: "golden_boot", description: "Bota" },
    { user_id: "u1", match_id: null, points: 3, rule_key: "golden_ball", description: "Balon" },
    { user_id: "u2", match_id: null, points: 0, rule_key: "golden_glove", description: "Nada" },
    { user_id: "u3", match_id: 7, points: 4, rule_key: "exact_score", description: "Partido" },
  ]);

  assert.deepEqual(events.map((event) => event.user_id), ["u1"]);
  assert.equal(events[0].points, 8);
  assert.deepEqual(events[0].descriptions, ["Bota", "Balon"]);
});

test("expone errores al insertar notificaciones internas", () => {
  assert.throws(
    () =>
      assertNotificationInsertSucceeded({
        error: { message: "new row violates row-level security policy" },
      }),
    /row-level security/
  );
});
