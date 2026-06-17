import assert from "node:assert/strict";
import test from "node:test";

import { runRecalculationBeforeNotifications } from "./result-recalculation";

test("recalcula antes de publicar notificaciones y no revierte si la notificacion falla", async () => {
  const calls: string[] = [];
  const notificationErrors: unknown[] = [];

  const result = await runRecalculationBeforeNotifications({
    recalculate: async () => {
      calls.push("recalculate");
      return { success: true, events: [{ points: 1 }] };
    },
    publishNotifications: async () => {
      calls.push("notify");
      throw new Error("notification failed");
    },
    onRecalculateError: () => {
      calls.push("recalculate-error");
    },
    onNotificationError: (error) => {
      notificationErrors.push(error);
    },
  });

  assert.deepEqual(calls, ["recalculate", "notify"]);
  assert.equal(result.recalculated, true);
  assert.equal(notificationErrors.length, 1);
});

test("no publica notificaciones cuando el recalculo falla", async () => {
  const calls: string[] = [];
  const recalculateErrors: Array<string | undefined> = [];

  const result = await runRecalculationBeforeNotifications({
    recalculate: async () => {
      calls.push("recalculate");
      return { success: false, error: "score failed" };
    },
    publishNotifications: async () => {
      calls.push("notify");
    },
    onRecalculateError: (error) => {
      recalculateErrors.push(error);
    },
    onNotificationError: () => {
      calls.push("notification-error");
    },
  });

  assert.deepEqual(calls, ["recalculate"]);
  assert.deepEqual(recalculateErrors, ["score failed"]);
  assert.equal(result.recalculated, false);
});
