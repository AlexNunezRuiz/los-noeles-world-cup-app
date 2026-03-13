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
  semi_final: "exact_qf",
  third_place: "exact_third",
  final: "exact_final",
};

const STAGE_LABEL: Record<string, string> = {
  round_of_32: "Octavos",
  round_of_16: "Cuartos",
  quarter_final: "Semifinal",
  semi_final: "Semifinal",
  third_place: "3er/4to",
  final: "Final",
};

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
  rules: Map<string, number>
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
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
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
