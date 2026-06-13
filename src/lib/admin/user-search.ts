export interface AdminUserSearchProfile {
  display_name: string | null;
  email: string | null;
  has_paid: boolean;
  is_active?: boolean | null;
  is_admin: boolean;
  is_chat_banned: boolean;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterAdminUsers<T extends AdminUserSearchProfile>(profiles: T[], query: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return profiles;

  return profiles.filter((profile) => {
    if (terms.includes("activo") && profile.is_active === false) return false;
    if (terms.includes("inactivo") && profile.is_active !== false) return false;

    const haystack = normalize(
      [
        profile.display_name ?? "",
        profile.email ?? "",
        profile.has_paid ? "pagado pago confirmado" : "pendiente sin pagar no pagado",
        profile.is_active === false ? "inactivo desactivado no participa" : "activo participa",
        profile.is_admin ? "admin administrador" : "usuario",
        profile.is_chat_banned ? "ban chat baneado" : "chat activo",
      ].join(" ")
    );

    return terms.every((term) => haystack.includes(term));
  });
}
