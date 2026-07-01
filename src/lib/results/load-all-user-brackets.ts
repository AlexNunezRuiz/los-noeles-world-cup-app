import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUserBracket, type BuiltUserBracket } from "@/lib/results/user-bracket";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

export interface AllBracketsMatch {
  id: number;
  match_number: number;
  stage: string;
  home_placeholder: string | null;
  away_placeholder: string | null;
}

interface StandingRow {
  user_id: string;
  group_letter: string;
  team_id: number;
  position: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
}
interface BestThirdRow {
  user_id: string;
  team_id: number;
  rank: number;
}
interface PredRow {
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  penalty_winner: "home" | "away" | null;
}

function pushInto<T>(map: Map<string, T[]>, key: string, value: T) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/**
 * Reconstruye el cuadro predicho de TODOS los participantes, indexado por
 * user_id, para poder mostrar qué cruce lleva cada uno. Usa `fetchAllRows`
 * porque `predicted_group_standings` y `match_predictions` superan el límite de
 * filas de PostgREST y un select sin paginar se truncaría silenciosamente.
 */
export async function loadAllUserBrackets(
  supabase: SupabaseClient,
  matches: AllBracketsMatch[]
): Promise<Map<string, BuiltUserBracket>> {
  const knockoutMatchIds = new Set(
    matches.filter((m) => m.stage !== "group").map((m) => m.id)
  );
  const matchNumberById = new Map(matches.map((m) => [m.id, m.match_number]));

  const [standingsRes, bestThirdRes, predsRes, positionsRes] = await Promise.all([
    fetchAllRows<StandingRow>((from, to) =>
      supabase
        .from("predicted_group_standings")
        .select("user_id, group_letter, team_id, position, points, goals_for, goals_against, goal_difference")
        .range(from, to)
    ),
    fetchAllRows<BestThirdRow>((from, to) =>
      supabase.from("predicted_best_third_order").select("user_id, team_id, rank").range(from, to)
    ),
    fetchAllRows<PredRow>((from, to) =>
      supabase
        .from("match_predictions")
        .select("user_id, match_id, home_score, away_score, penalty_winner")
        .range(from, to)
    ),
    supabase.from("knockout_bracket_positions").select("*"),
  ]);

  const bracketPositions = (positionsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bracketPositions"];
  const baseMatches = matches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number,
      stage: m.stage,
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
    }));

  const standingsByUser = new Map<string, StandingRow[]>();
  for (const row of standingsRes.data ?? []) pushInto(standingsByUser, row.user_id, row);

  const bestThirdByUser = new Map<string, BestThirdRow[]>();
  for (const row of bestThirdRes.data ?? []) pushInto(bestThirdByUser, row.user_id, row);

  const predsByUser = new Map<string, PredRow[]>();
  for (const row of predsRes.data ?? []) {
    if (!knockoutMatchIds.has(row.match_id)) continue;
    pushInto(predsByUser, row.user_id, row);
  }

  const userIds = new Set<string>([
    ...standingsByUser.keys(),
    ...predsByUser.keys(),
  ]);

  const result = new Map<string, BuiltUserBracket>();
  for (const userId of userIds) {
    result.set(
      userId,
      buildUserBracket({
        baseMatches,
        predictedStandings: standingsByUser.get(userId) ?? [],
        bestThirdOrder: bestThirdByUser.get(userId) ?? [],
        predictions: (predsByUser.get(userId) ?? []).map((p) => ({
          match_number: matchNumberById.get(p.match_id) ?? -1,
          home_score: p.home_score,
          away_score: p.away_score,
          penalty_winner: p.penalty_winner,
        })),
        bracketPositions,
      })
    );
  }

  return result;
}
