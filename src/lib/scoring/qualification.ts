interface ScoreEvent {
  user_id: string;
  match_id: number | null;
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

type QualificationMatch = {
  match_number: number;
  stage: string;
  home_team_id?: number | null;
  away_team_id?: number | null;
  home_score?: number | null;
  away_score?: number | null;
  penalty_winner_team_id?: number | null;
  is_finished?: boolean | null;
};

// Pura: recibe las eliminatorias ya cargadas (el recálculo consulta `matches`
// una sola vez y la reutiliza en todos los scorers).
export function scoreQualification(
  matches: QualificationMatch[],
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  for (const stage of ["round_of_32", "round_of_16", "quarter_final", "semi_final", "final"]) {
    const stageMatches = matches.filter((match) => match.stage === stage);
    if (stage === "round_of_32" && !areAllStageMatchesPopulated(stageMatches)) {
      continue;
    }

    const qualifiedTeamIds = Array.from(new Set(
      stageMatches
        .flatMap((match) => [match.home_team_id, match.away_team_id])
        .filter((teamId): teamId is number => typeof teamId === "number")
    ));
    events.push(...scoreQualificationStage(stage, qualifiedTeamIds, rules, matches, predictedMatchesByUser));
  }

  const final = matches.find((match) => match.stage === "final" && match.is_finished);
  const thirdPlace = matches.find((match) => match.stage === "third_place" && match.is_finished);
  if (final?.home_team_id && final.away_team_id && final.home_score != null && final.away_score != null) {
    const winnerId =
      final.home_score > final.away_score
        ? final.home_team_id
        : final.away_score > final.home_score
          ? final.away_team_id
          : final.penalty_winner_team_id;
    if (winnerId) {
      const loserId = winnerId === final.home_team_id ? final.away_team_id : final.home_team_id;
      events.push(...scoreQualificationStage("final_winner", [winnerId], rules, matches, predictedMatchesByUser, "final", "winner"));
      events.push(...scoreQualificationStage("final_loser", [loserId], rules, matches, predictedMatchesByUser, "final", "loser"));
    }
  }
  if (thirdPlace?.home_team_id && thirdPlace.away_team_id && thirdPlace.home_score != null && thirdPlace.away_score != null) {
    const winnerId =
      thirdPlace.home_score > thirdPlace.away_score
        ? thirdPlace.home_team_id
        : thirdPlace.away_score > thirdPlace.home_score
          ? thirdPlace.away_team_id
          : thirdPlace.penalty_winner_team_id;
    if (winnerId) {
      const loserId = winnerId === thirdPlace.home_team_id ? thirdPlace.away_team_id : thirdPlace.home_team_id;
      events.push(...scoreQualificationStage("third_place_winner", [winnerId], rules, matches, predictedMatchesByUser, "third_place", "winner"));
      events.push(...scoreQualificationStage("third_place_loser", [loserId], rules, matches, predictedMatchesByUser, "third_place", "loser"));
    }
  }

  return events;
}

function areAllStageMatchesPopulated(matches: QualificationMatch[]): boolean {
  return matches.length > 0 && matches.every((match) =>
    typeof match.home_team_id === "number" &&
    typeof match.away_team_id === "number"
  );
}

function scoreQualificationStage(
  stage: string,
  qualifiedTeamIds: number[],
  rules: Map<string, number>,
  matches: Array<{ match_number: number; stage: string }>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  matchStage = stage,
  requirement: "stage" | "winner" | "loser" = "stage"
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  const ruleKeyMap: Record<string, string> = {
    round_of_32: "qualify_r32",
    round_of_16: "qualify_r16",
    quarter_final: "qualify_qf",
    semi_final: "qualify_sf",
    final: "qualify_finalist",
    final_winner: "qualify_champion",
    final_loser: "qualify_runner_up",
    third_place_winner: "qualify_third",
    third_place_loser: "qualify_fourth",
  };

  const ruleKey = ruleKeyMap[stage];
  if (!ruleKey) return events;

  const pts = rules.get(ruleKey) || 0;
  if (pts === 0) return events;

  for (const [userId, userPredictedMatches] of Array.from(predictedMatchesByUser.entries())) {
    for (const teamId of qualifiedTeamIds) {
      const userPredictedTeamInStage =
        requirement === "winner"
          ? didPredictTeamWinStage(matches, userPredictedMatches, matchStage, teamId)
          : requirement === "loser"
            ? didPredictTeamLoseStage(matches, userPredictedMatches, matchStage, teamId)
            : didPredictTeamInStage(matches, userPredictedMatches, matchStage, teamId);

      if (userPredictedTeamInStage) {
        events.push({
          user_id: userId,
          match_id: null,
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

export function didPredictTeamLoseStage(
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
      return predictedMatch.away_team_id === teamId;
    }
    if (predictedMatch.away_score > predictedMatch.home_score) {
      return predictedMatch.home_team_id === teamId;
    }
    if (predictedMatch.penalty_winner === "home") {
      return predictedMatch.away_team_id === teamId;
    }
    if (predictedMatch.penalty_winner === "away") {
      return predictedMatch.home_team_id === teamId;
    }
    return false;
  });
}
