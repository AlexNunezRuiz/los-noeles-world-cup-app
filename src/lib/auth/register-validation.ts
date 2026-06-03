export interface RegisterFields {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const REQUIRED_REGISTER_FIELDS: Array<[keyof RegisterFields, string]> = [
  ["username", "usuario"],
  ["displayName", "nombre"],
  ["email", "correo"],
  ["password", "contrasena"],
  ["confirmPassword", "repetir contrasena"],
];

export function getMissingRegisterFields(fields: RegisterFields): string[] {
  return REQUIRED_REGISTER_FIELDS.filter(([key]) => !fields[key].trim()).map(([, label]) => label);
}

