import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNotificationInsertSucceeded,
  buildNotificationRows,
  scoreEventsForMatchNotifications,
} from "./internal";

test("construye notificaciones para todos salvo excluidos", () => {
  const rows = buildNotificationRows({
    profiles: [{ id: "u1" }, { id: "u2" }, { id: "admin" }],
    excludeUserIds: new Set(["admin"]),
    type: "result_update",
    actorUserId: "admin",
    title: "Resultado nuevo",
    body: "P1: A 2-1 B",
    link: "/resultados",
  });

  assert.deepEqual(rows.map((row) => row.user_id), ["u1", "u2"]);
  assert.equal(rows[0].type, "result_update");
  assert.equal(rows[0].actor_user_id, "admin");
  assert.equal(rows[0].title, "Resultado nuevo");
  assert.equal(rows[0].link, "/resultados");
});

test("solo notifica aciertos positivos de un partido", () => {
  const events = scoreEventsForMatchNotifications(
    [
      { user_id: "u1", match_id: 7, points: 3, rule_key: "correct_sign", description: "Signo" },
      { user_id: "u1", match_id: 7, points: 1, rule_key: "exact_score", description: "Exacto" },
      { user_id: "u2", match_id: 7, points: 0, rule_key: "correct_sign", description: "Nada" },
      { user_id: "u3", match_id: 8, points: 3, rule_key: "correct_sign", description: "Otro" },
      { user_id: "u4", match_id: 7, points: 4, rule_key: "qualify_r16", description: "Clasifica" },
    ],
    7
  );

  assert.deepEqual(events.map((event) => event.user_id), ["u1"]);
  assert.equal(events[0].points, 4);
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
