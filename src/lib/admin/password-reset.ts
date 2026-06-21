export const MANUAL_PASSWORD_MIN_LENGTH = 8;

type ManualPasswordResetSuccess = { ok: true };
type ManualPasswordResetFailure = { ok: false; status: number; error: string };

export type ManualPasswordResetResult =
  | ManualPasswordResetSuccess
  | ManualPasswordResetFailure;

export type UpdateUserPassword = (
  userId: string,
  password: string
) => Promise<{ error: { message?: string } | null }>;

export async function resetUserPasswordManually({
  actorIsAdmin,
  actorUserId,
  targetUserId,
  password,
  updateUserPassword,
}: {
  actorIsAdmin: boolean;
  actorUserId: string | null | undefined;
  targetUserId: string | null | undefined;
  password: string;
  updateUserPassword: UpdateUserPassword;
}): Promise<ManualPasswordResetResult> {
  const cleanTargetUserId = targetUserId?.trim();

  if (!actorUserId) {
    return { ok: false, status: 401, error: "Sesion no valida." };
  }

  if (!actorIsAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Solo un administrador puede cambiar contrasenas.",
    };
  }

  if (!cleanTargetUserId) {
    return { ok: false, status: 400, error: "Falta el usuario." };
  }

  if (password.length < MANUAL_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `La contrasena temporal debe tener al menos ${MANUAL_PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  const { error } = await updateUserPassword(cleanTargetUserId, password);
  if (error) {
    return {
      ok: false,
      status: 502,
      error: error.message
        ? `Supabase no pudo cambiar la contrasena: ${error.message}`
        : "Supabase no pudo cambiar la contrasena.",
    };
  }

  return { ok: true };
}
