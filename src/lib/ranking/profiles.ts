import { isMissingProfilesColumnError } from "@/lib/supabase/errors";

export interface RankingProfileRow {
  id: string;
  display_name: string;
  has_paid: boolean;
  is_active?: boolean | null;
}

interface ProfilesQueryResult {
  data: unknown[] | null;
  error: unknown;
}

interface ProfilesQuery {
  select(columns: string): PromiseLike<ProfilesQueryResult>;
}

interface ProfilesClient {
  from(table: "profiles"): ProfilesQuery;
}

const ACTIVE_PROFILE_COLUMNS = "id, display_name, has_paid, is_active";
const LEGACY_PROFILE_COLUMNS = "id, display_name, has_paid";

function toError(error: unknown) {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message));
  }
  return new Error("No se pudieron cargar los perfiles del ranking");
}

export async function fetchRankingProfiles(
  supabase: ProfilesClient
): Promise<RankingProfileRow[]> {
  const activeProfiles = await supabase
    .from("profiles")
    .select(ACTIVE_PROFILE_COLUMNS);

  if (!activeProfiles.error) {
    return (activeProfiles.data ?? []) as RankingProfileRow[];
  }

  if (!isMissingProfilesColumnError(activeProfiles.error)) {
    throw toError(activeProfiles.error);
  }

  const legacyProfiles = await supabase
    .from("profiles")
    .select(LEGACY_PROFILE_COLUMNS);

  if (legacyProfiles.error) {
    throw toError(legacyProfiles.error);
  }

  return (legacyProfiles.data ?? []) as RankingProfileRow[];
}
