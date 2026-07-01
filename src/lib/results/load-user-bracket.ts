import type { SupabaseClient } from "@supabase/supabase-js";
import { buildUserBracket, type BuiltUserBracket } from "@/lib/results/user-bracket";

export interface LoadUserBracketMatch {
  id: number;
  match_number: number;
  stage: string;
  home_placeholder: string | null;
  away_placeholder: string | null;
}

export interface LoadUserBracketPrediction {
  match_id: number;
  home_score: number;
  away_score: number;
  penalty_winner?: "home" | "away" | null;
}

const EMPTY: BuiltUserBracket = {
  byMatchNumber: new Map(),
  stageByMatchNumber: new Map(),
};

/**
 * Reconstruye el cuadro predicho del usuario a partir de sus posiciones de grupo,
 * orden de mejores terceros y predicciones de partido. Reutilizable en Calendario,
 * Resultados y Detalle. Devuelve mapas vacíos si no hay usuario.
 */
export async function loadUserBracket(
  supabase: SupabaseClient,
  uid: string,
  matches: LoadUserBracketMatch[],
  predictions: LoadUserBracketPrediction[]
): Promise<BuiltUserBracket> {
  if (!uid) return EMPTY;

  const [standingsRes, bestThirdRes, positionsRes] = await Promise.all([
    supabase
      .from("predicted_group_standings")
      .select("group_letter, team_id, position, points, goals_for, goals_against, goal_difference")
      .eq("user_id", uid),
    supabase.from("predicted_best_third_order").select("team_id, rank").eq("user_id", uid),
    supabase.from("knockout_bracket_positions").select("*"),
  ]);

  const predictedStandings = (standingsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["predictedStandings"];
  const bestThirdOrder = (bestThirdRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bestThirdOrder"];
  const bracketPositions = (positionsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bracketPositions"];

  const matchNumberById = new Map(matches.map((m) => [m.id, m.match_number]));

  const knockoutBase = matches
    .filter((m) => m.stage !== "group")
    .map((m) => ({
      match_number: m.match_number,
      stage: m.stage,
      home_placeholder: m.home_placeholder,
      away_placeholder: m.away_placeholder,
    }));

  const predForBracket = predictions
    .map((p) => ({
      match_number: matchNumberById.get(p.match_id) ?? -1,
      home_score: p.home_score,
      away_score: p.away_score,
      penalty_winner: p.penalty_winner ?? null,
    }))
    .filter((p) => p.match_number > 0);

  return buildUserBracket({
    baseMatches: knockoutBase,
    predictedStandings,
    bestThirdOrder,
    predictions: predForBracket,
    bracketPositions,
  });
}
