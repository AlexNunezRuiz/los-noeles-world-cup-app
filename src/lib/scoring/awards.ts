import type { SupabaseClient } from "@supabase/supabase-js";

interface ScoreEvent {
  user_id: string;
  match_id: number | null;
  rule_key: string;
  points: number;
  description: string;
}

const AWARD_LABELS: Record<string, string> = {
  golden_boot: "Bota de Oro",
  golden_ball: "Balón de Oro",
  golden_glove: "Guante de Oro",
};

export async function scoreAwards(
  supabase: SupabaseClient,
  rules: Map<string, number>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];

  // Get actual awards
  const { data: actualAwards } = await supabase.from("actual_awards").select("*");
  if (!actualAwards || actualAwards.length === 0) return events;

  // Get all user predictions
  const { data: predictions } = await supabase.from("award_predictions").select("*");
  if (!predictions) return events;

  for (const actual of actualAwards) {
    const pts = rules.get(actual.award_type) || 10;

    for (const pred of predictions) {
      if (pred.award_type !== actual.award_type) continue;

      // Match by player_id or player_name (case-insensitive)
      const matchById = actual.player_id && pred.player_id && actual.player_id === pred.player_id;
      const matchByName =
        actual.player_name &&
        pred.player_name &&
        actual.player_name.toLowerCase().trim() === pred.player_name.toLowerCase().trim();

      if (matchById || matchByName) {
        events.push({
          user_id: pred.user_id,
          match_id: null,
          rule_key: actual.award_type,
          points: pts,
          description: `Acertó ${AWARD_LABELS[actual.award_type]}: ${actual.player_name}`,
        });
      }
    }
  }

  return events;
}
