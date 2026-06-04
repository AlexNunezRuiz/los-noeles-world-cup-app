import type { SupabaseClient } from "@supabase/supabase-js";

interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

const STAGE_RULE_MAP: Record<string, string> = {
  round_of_32: "exact_r32",
  round_of_16: "exact_r16",
  quarter_final: "exact_qf",
  semi_final: "exact_sf",
  third_place: "exact_third",
  final: "exact_final",
};

const STAGE_LABEL: Record<string, string> = {
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinales",
  third_place: "3er/4to",
  final: "Final",
};

type Side = "home" | "away";

interface KnockoutExactInput {
  actual: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    penaltyWinner?: Side | null;
  };
  predicted: {
    homeTeamId?: number;
    awayTeamId?: number;
    homeScore: number;
    awayScore: number;
    penaltyWinner?: Side | null;
  };
}

export function isKnockoutExactEligible({ actual, predicted }: KnockoutExactInput): boolean {
  if (predicted.homeTeamId !== actual.homeTeamId || predicted.awayTeamId !== actual.awayTeamId) {
    return false;
  }
  if (predicted.homeScore !== actual.homeScore || predicted.awayScore !== actual.awayScore) {
    return false;
  }
  if (actual.homeScore === actual.awayScore) {
    return predicted.penaltyWinner === actual.penaltyWinner;
  }
  return true;
}

export async function scoreKnockoutExact(
  supabase: SupabaseClient,
  match: {
    id: number;
    match_number: number;
    stage: string;
    home_score: number;
    away_score: number;
    penalty_winner_team_id?: number;
    home_team_id: number;
    away_team_id: number;
  },
  rules: Map<string, number>,
  predictedMatchesByUser?: Map<string, Map<number, { home_team_id?: number; away_team_id?: number }>>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const ruleKey = STAGE_RULE_MAP[match.stage];
  if (!ruleKey) return events;

  const { data: predictions } = await supabase
    .from("match_predictions")
    .select("*")
    .eq("match_id", match.id);

  if (!predictions) return events;

  for (const pred of predictions) {
    const predictedMatch = predictedMatchesByUser?.get(pred.user_id)?.get(match.match_number);
    if (isKnockoutExactEligible({
      actual: {
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        homeScore: match.home_score,
        awayScore: match.away_score,
        penaltyWinner:
          match.penalty_winner_team_id === match.home_team_id
            ? "home"
            : match.penalty_winner_team_id === match.away_team_id
              ? "away"
              : null,
      },
      predicted: {
        homeTeamId: predictedMatch?.home_team_id,
        awayTeamId: predictedMatch?.away_team_id,
        homeScore: pred.home_score,
        awayScore: pred.away_score,
        penaltyWinner: pred.penalty_winner,
      },
    })) {
      const pts = rules.get(ruleKey) || 0;
      if (pts > 0) {
        events.push({
          user_id: pred.user_id,
          match_id: match.id,
          rule_key: ruleKey,
          points: pts,
          description: `Exacto ${match.home_score}-${match.away_score} en ${STAGE_LABEL[match.stage]} P${match.match_number}`,
        });
      }
    }
  }

  return events;
}
