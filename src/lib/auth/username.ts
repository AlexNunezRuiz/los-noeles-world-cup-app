// Autenticación por usuario.
// Las cuentas usan el correo real como identidad en Supabase. El usuario se
// guarda en `profiles.username` y, al iniciar sesión por usuario, se resuelve
// su correo con la función `email_for_username` del servidor.

const SYNTH_DOMAIN = "noeles.app";

/** Normaliza el usuario: minúsculas y sin espacios alrededor. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Correo sintético a partir del usuario. Solo se usa como reserva para el
 * login por usuario cuando la búsqueda en servidor no está disponible
 * (por ejemplo, en modo mock).
 */
export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${SYNTH_DOMAIN}`;
}

/**
 * Valida el formato del usuario. Devuelve un mensaje de error, o null si es
 * válido.
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
