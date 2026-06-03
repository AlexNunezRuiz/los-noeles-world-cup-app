export type UserStatus = "admin" | "paid" | "unpaid";

export interface UserStatusSource {
  is_admin?: boolean | null;
  has_paid?: boolean | null;
}

export function getUserStatus(user: UserStatusSource | null | undefined): UserStatus {
  if (user?.is_admin) return "admin";
  if (user?.has_paid) return "paid";
  return "unpaid";
}

export function getUserStatusLabel(status: UserStatus): string {
  if (status === "admin") return "Admin";
  if (status === "paid") return "Pagado";
  return "No pagado";
}
