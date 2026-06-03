import type { SupabaseClient } from "@supabase/supabase-js";

interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

export async function scoreQualification(
  supabase: SupabaseClient,
  rules: Map<string, number>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, stage, home_team_id, away_team_id, home_score, away_score, is_finished")
    .neq("stage", "group");

  if (!matches) return events;

  for (const stage of ["round_of_32", "round_of_16", "quarter_final", "semi_final"]) {
    const qualifiedTeamIds = Array.from(new Set(
      matches
        .filter((match) => match.stage === stage)
        .flatMap((match) => [match.home_team_id, match.away_team_id])
        .filter((teamId): teamId is number => typeof teamId === "number")
    ));
    events.push(...await scoreQualificationStage(supabase, stage, qualifiedTeamIds, rules));
  }

  const final = matches.find((match) => match.stage === "final" && match.is_finished);
  const thirdPlace = matches.find((match) => match.stage === "third_place" && match.is_finished);
  if (final?.home_team_id && final.away_team_id && final.home_score !== null && final.away_score !== null) {
    const winnerId = final.home_score > final.away_score ? final.home_team_id : final.away_team_id;
    events.push(...await scoreQualificationStage(supabase, "final_winner", [winnerId], rules));
  }
  if (thirdPlace?.home_team_id && thirdPlace.away_team_id && thirdPlace.home_score !== null && thirdPlace.away_score !== null) {
    const winnerId = thirdPlace.home_score > thirdPlace.away_score ? thirdPlace.home_team_id : thirdPlace.away_team_id;
    events.push(...await scoreQualificationStage(supabase, "third_place_winner", [winnerId], rules));
  }

  return events;
}

async function scoreQualificationStage(
  supabase: SupabaseClient,
  stage: string,
  qualifiedTeamIds: number[],
  rules: Map<string, number>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];

  const ruleKeyMap: Record<string, string> = {
    round_of_32: "qualify_r32",
    round_of_16: "qualify_r16",
    quarter_final: "qualify_qf",
    semi_final: "qualify_sf",
    final_winner: "qualify_champion",
    third_place_winner: "qualify_third",
  };

  const ruleKey = ruleKeyMap[stage];
  if (!ruleKey) return events;

  const pts = rules.get(ruleKey) || 0;
  if (pts === 0) return events;

  // Get all users' knockout predictions and find who predicted each team in this position
  // For qualification bonuses, we check if the team appears in any match at this stage or beyond
  // in the user's predicted bracket

  // Get all match predictions
  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, stage, home_team_id, away_team_id")
    .neq("stage", "group");

  if (!matches) return events;

  const { data: allPredictions } = await supabase
    .from("match_predictions")
    .select("*");

  if (!allPredictions) return events;

  // Group predictions by user
  type Pred = { user_id: string; match_id: number };
  const byUser = new Map<string, Pred[]>();
  for (const p of allPredictions) {
    const list = byUser.get(p.user_id) || [];
    list.push(p);
    byUser.set(p.user_id, list);
  }

  // For each user, check if they predicted the qualified teams
  for (const [userId, userPreds] of Array.from(byUser.entries())) {
    for (const teamId of qualifiedTeamIds) {
      const userPredictedTeamInStage = matches.some((m) => {
        if (m.stage !== stage) return false;
        const pred = userPreds.find((up: Pred) => up.match_id === m.id);
        if (!pred) return false;
        // Check if this team was predicted as home or away in this match
        return m.home_team_id === teamId || m.away_team_id === teamId;
      });

      if (userPredictedTeamInStage) {
        events.push({
          user_id: userId,
          match_id: 0,
          rule_key: ruleKey,
          points: pts,
          description: `Equipo ${teamId} clasificado a ${stage}`,
        });
      }
    }
  }

  return events;
}
