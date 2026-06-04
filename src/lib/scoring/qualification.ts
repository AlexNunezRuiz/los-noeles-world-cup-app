import type { SupabaseClient } from "@supabase/supabase-js";

interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

type Side = "home" | "away";

export interface PredictedKnockoutMatch {
  home_team_id?: number;
  away_team_id?: number;
  home_score?: number;
  away_score?: number;
  penalty_winner?: Side;
}

export async function scoreQualification(
  supabase: SupabaseClient,
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, stage, home_team_id, away_team_id, home_score, away_score, penalty_winner_team_id, is_finished")
    .neq("stage", "group");

  if (!matches) return events;

  for (const stage of ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]) {
    const qualifiedTeamIds = Array.from(new Set(
      matches
        .filter((match) => match.stage === stage)
        .flatMap((match) => [match.home_team_id, match.away_team_id])
        .filter((teamId): teamId is number => typeof teamId === "number")
    ));
    events.push(...scoreQualificationStage(stage, qualifiedTeamIds, rules, matches, predictedMatchesByUser));
  }

  const final = matches.find((match) => match.stage === "final" && match.is_finished);
  const thirdPlace = matches.find((match) => match.stage === "third_place" && match.is_finished);
  if (final?.home_team_id && final.away_team_id && final.home_score !== null && final.away_score !== null) {
    const winnerId =
      final.home_score > final.away_score
        ? final.home_team_id
        : final.away_score > final.home_score
          ? final.away_team_id
          : final.penalty_winner_team_id;
    if (winnerId) {
      events.push(...scoreQualificationStage("final_winner", [winnerId], rules, matches, predictedMatchesByUser, "final", true));
    }
  }
  if (thirdPlace?.home_team_id && thirdPlace.away_team_id && thirdPlace.home_score !== null && thirdPlace.away_score !== null) {
    const winnerId =
      thirdPlace.home_score > thirdPlace.away_score
        ? thirdPlace.home_team_id
        : thirdPlace.away_score > thirdPlace.home_score
          ? thirdPlace.away_team_id
          : thirdPlace.penalty_winner_team_id;
    if (winnerId) {
      events.push(...scoreQualificationStage("third_place_winner", [winnerId], rules, matches, predictedMatchesByUser, "third_place", true));
    }
  }

  return events;
}

function scoreQualificationStage(
  stage: string,
  qualifiedTeamIds: number[],
  rules: Map<string, number>,
  matches: Array<{ match_number: number; stage: string }>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  matchStage = stage,
  requireWinner = false
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  const ruleKeyMap: Record<string, string> = {
    round_of_32: "qualify_r32",
    round_of_16: "qualify_r16",
    quarter_final: "qualify_qf",
    semi_final: "qualify_sf",
    final: "qualify_finalist",
    final_winner: "qualify_champion",
    third_place_winner: "qualify_third",
  };

  const ruleKey = ruleKeyMap[stage];
  if (!ruleKey) return events;

  const pts = rules.get(ruleKey) || 0;
  if (pts === 0) return events;

  for (const [userId, userPredictedMatches] of Array.from(predictedMatchesByUser.entries())) {
    for (const teamId of qualifiedTeamIds) {
      const userPredictedTeamInStage = requireWinner
        ? didPredictTeamWinStage(matches, userPredictedMatches, matchStage, teamId)
        : didPredictTeamInStage(matches, userPredictedMatches, matchStage, teamId);

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

export function didPredictTeamInStage(
  matches: Array<{ match_number: number; stage: string }>,
  predictedMatches: Map<number, PredictedKnockoutMatch>,
  stage: string,
  teamId: number
): boolean {
  return matches.some((match) => {
    if (match.stage !== stage) return false;
    const predictedMatch = predictedMatches.get(match.match_number);
    return predictedMatch?.home_team_id === teamId || predictedMatch?.away_team_id === teamId;
  });
}

export function didPredictTeamWinStage(
  matches: Array<{ match_number: number; stage: string }>,
  predictedMatches: Map<number, PredictedKnockoutMatch>,
  stage: string,
  teamId: number
): boolean {
  return matches.some((match) => {
    if (match.stage !== stage) return false;
    const predictedMatch = predictedMatches.get(match.match_number);
    if (!predictedMatch || predictedMatch.home_team_id === undefined || predictedMatch.away_team_id === undefined) {
      return false;
    }
    if (predictedMatch.home_score === undefined || predictedMatch.away_score === undefined) {
      return false;
    }

    if (predictedMatch.home_score > predictedMatch.away_score) {
      return predictedMatch.home_team_id === teamId;
    }
    if (predictedMatch.away_score > predictedMatch.home_score) {
      return predictedMatch.away_team_id === teamId;
    }
    if (predictedMatch.penalty_winner === "home") {
      return predictedMatch.home_team_id === teamId;
    }
    if (predictedMatch.penalty_winner === "away") {
      return predictedMatch.away_team_id === teamId;
    }
    return false;
  });
}
