export type AdminUserSortKey =
  | "display_name"
  | "email"
  | "porra_pct"
  | "last_prediction_updated_at"
  | "has_paid"
  | "is_active"
  | "paid_at"
  | "is_chat_banned"
  | "is_admin"
  | "created_at";

export type AdminUserSortDirection = "asc" | "desc";

export interface AdminUserSortProfile {
  display_name: string | null;
  email: string | null;
  porra_pct: number;
  last_prediction_updated_at: string | null;
  has_paid: boolean;
  is_active?: boolean | null;
  paid_at: string | null;
  is_chat_banned: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AdminUserSort {
  key: AdminUserSortKey;
  direction: AdminUserSortDirection;
}

function compareText(a: string | null, b: string | null) {
  return (a ?? "").localeCompare(b ?? "", "es", { sensitivity: "base" });
}

function compareBoolean(a: boolean, b: boolean) {
  return Number(a) - Number(b);
}

function compareNumber(a: number, b: number) {
  return a - b;
}

function compareNullableDate(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return Date.parse(a) - Date.parse(b);
}

function compareByKey<T extends AdminUserSortProfile>(a: T, b: T, key: AdminUserSortKey) {
  switch (key) {
    case "display_name":
    case "email":
      return compareText(a[key], b[key]);
    case "porra_pct":
      return compareNumber(a.porra_pct, b.porra_pct);
    case "last_prediction_updated_at":
    case "paid_at":
      return compareNullableDate(a[key], b[key]);
    case "has_paid":
    case "is_active":
    case "is_chat_banned":
    case "is_admin":
      return compareBoolean(a[key] !== false, b[key] !== false);
    case "created_at":
      return Date.parse(a.created_at) - Date.parse(b.created_at);
  }
}

function getNullableDateValue<T extends AdminUserSortProfile>(profile: T, key: AdminUserSortKey) {
  return key === "last_prediction_updated_at" || key === "paid_at" ? profile[key] : undefined;
}

export function sortAdminUsers<T extends AdminUserSortProfile>(profiles: T[], sort: AdminUserSort) {
  return [...profiles].sort((a, b) => {
    const aDate = getNullableDateValue(a, sort.key);
    const bDate = getNullableDateValue(b, sort.key);
    if (aDate !== undefined || bDate !== undefined) {
      if (!aDate && !bDate) return compareText(a.display_name, b.display_name);
      if (!aDate) return 1;
      if (!bDate) return -1;
    }

    const result = compareByKey(a, b, sort.key);
    if (result !== 0) return sort.direction === "asc" ? result : -result;
    return compareText(a.display_name, b.display_name);
  });
}
