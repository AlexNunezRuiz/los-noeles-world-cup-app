import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PasswordInput } from "./password-input";

test("renderiza la contrasena oculta con boton accesible para mostrarla", () => {
  const html = renderToStaticMarkup(
    React.createElement(PasswordInput, {
      id: "password",
      value: "",
      onChange: () => {},
      placeholder: "Minimo 6 caracteres",
    })
  );

  assert.match(html, /type="password"/);
  assert.match(html, /aria-label="Mostrar contraseña"/);
});
