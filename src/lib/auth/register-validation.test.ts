import assert from "node:assert/strict";
import test from "node:test";

import { getMissingRegisterFields } from "./register-validation";

test("detecta todos los campos obligatorios vacios en registro", () => {
  assert.deepEqual(
    getMissingRegisterFields({
      username: "",
      displayName: "   ",
      email: "",
      password: "",
      confirmPassword: "",
    }),
    ["usuario", "nombre", "correo", "contrasena", "repetir contrasena"]
  );
});

test("ignora espacios y devuelve solo el campo obligatorio que falta", () => {
  assert.deepEqual(
    getMissingRegisterFields({
      username: "noe",
      displayName: "Noe",
      email: "noe@example.com",
      password: "secret1",
      confirmPassword: "   ",
    }),
    ["repetir contrasena"]
  );
});

