import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHomeMessageNotification,
  getSpecialHomeMessages,
  type HomeMessage,
} from "./messages";

const baseMessage: HomeMessage = {
  id: "m1",
  slug: "general",
  title: "Aviso importante",
  body: "Hay cambios en la porra para esta semana.",
  link_label: null,
  link_href: null,
  tone: "info",
  is_published: true,
  is_pinned: true,
  created_at: "2026-06-04T10:00:00Z",
  updated_at: "2026-06-04T10:00:00Z",
};

test("identifica mensajes especiales publicados", () => {
  const messages: HomeMessage[] = [
    { ...baseMessage, slug: "payment-info", title: "Pago", tone: "payment" },
    { ...baseMessage, id: "m2", slug: "install-info", title: "Instala la app" },
    { ...baseMessage, id: "m3", slug: "install-info", is_published: false },
  ];

  const special = getSpecialHomeMessages(messages);

  assert.equal(special.payment?.title, "Pago");
  assert.equal(special.install?.title, "Instala la app");
});

test("devuelve mensajes generales sin los especiales", () => {
  const messages: HomeMessage[] = [
    { ...baseMessage, slug: "payment-info", title: "Pago" },
    { ...baseMessage, id: "m2", slug: "install-info", title: "Instala" },
    { ...baseMessage, id: "m3", slug: "rules", title: "Normas" },
  ];

  const special = getSpecialHomeMessages(messages);

  assert.deepEqual(
    special.general.map((message) => message.slug),
    ["rules"]
  );
});

test("construye notificacion interna para mensajes publicados", () => {
  const notification = buildHomeMessageNotification({
    ...baseMessage,
    body:
      "Este mensaje es deliberadamente largo para comprobar que la notificacion se recorta sin romper el flujo de lectura. El admin puede publicar instrucciones extensas, pero la campana solo necesita una vista previa clara.",
  });

  assert.equal(notification.title, "Aviso importante");
  assert.equal(notification.link, "/porra");
  assert.equal(notification.body.endsWith("..."), true);
  assert.equal(notification.body.length <= 123, true);
});
