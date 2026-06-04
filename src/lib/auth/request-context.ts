export const AUTH_CONTEXT_USER_ID_HEADER = "x-lnwc-user-id";
export const AUTH_CONTEXT_IS_ADMIN_HEADER = "x-lnwc-is-admin";

interface HeaderReader {
  get(name: string): string | null;
}

export interface AuthContext {
  userId: string | null;
  isAdmin: boolean;
}

export function readAuthContext(headers: HeaderReader): AuthContext {
  return {
    userId: headers.get(AUTH_CONTEXT_USER_ID_HEADER),
    isAdmin: headers.get(AUTH_CONTEXT_IS_ADMIN_HEADER) === "true",
  };
}

export function clearAuthContextHeaders(headers: Headers) {
  headers.delete(AUTH_CONTEXT_USER_ID_HEADER);
  headers.delete(AUTH_CONTEXT_IS_ADMIN_HEADER);
}

export function writeAuthContextHeaders(headers: Headers, context: AuthContext) {
  clearAuthContextHeaders(headers);
  if (context.userId) headers.set(AUTH_CONTEXT_USER_ID_HEADER, context.userId);
  headers.set(AUTH_CONTEXT_IS_ADMIN_HEADER, context.isAdmin ? "true" : "false");
}
