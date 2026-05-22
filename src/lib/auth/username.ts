// Autenticación por usuario.
// Supabase Auth necesita un email; lo sintetizamos a partir del usuario.
// El usuario nunca ve este email — es un detalle interno.

const SYNTH_DOMAIN = "noeles.app";

/** Normaliza el usuario: minúsculas y sin espacios alrededor. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Email sintético, determinista, a partir del usuario. */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${SYNTH_DOMAIN}`;
}

/**
 * Resuelve el email para iniciar sesión. Acepta tanto un usuario como un email
 * directo (útil para cuentas antiguas creadas con email real): si lo escrito
 * contiene "@" se trata como email; si no, se convierte al email sintético.
 */
export function resolveLoginEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : usernameToEmail(value);
}

/**
 * Valida el formato del usuario. Debe ser seguro como parte local de un email
 * y mapear 1:1 con su email sintético.
 * Devuelve un mensaje de error, o null si es válido.
 */
export function validateUsername(username: string): string | null {
  const u = normalizeUsername(username);
  if (u.length < 3) return "El usuario debe tener al menos 3 caracteres.";
  if (u.length > 30) return "El usuario es demasiado largo (máximo 30).";
  if (!/^[a-z0-9._-]+$/.test(u)) {
    return "El usuario solo puede tener letras, números y los signos . _ -";
  }
  return null;
}
