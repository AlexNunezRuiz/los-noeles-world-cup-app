import type { PredictedKnockoutMatch } from "./qualification";

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

export function findUserPredictionForPairing(
  userBracket: Map<number, PredictedKnockoutMatch>,
  stageByMatchNumber: Map<number, string>,
  stage: string,
  teamA: number,
  teamB: number
): PredictedKnockoutMatch | null {
  for (const [matchNumber, predicted] of Array.from(userBracket.entries())) {
    if (stageByMatchNumber.get(matchNumber) !== stage) continue;
    const home = predicted.home_team_id;
    const away = predicted.away_team_id;
    if (home === undefined || away === undefined) continue;
    if ((home === teamA && away === teamB) || (home === teamB && away === teamA)) {
      return predicted;
    }
  }
  return null;
}

interface KnockoutPairingInput {
  actual: {
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    penaltyWinner?: Side | null;
  };
  predicted: PredictedKnockoutMatch;
}

export function isKnockoutPairingExact({ actual, predicted }: KnockoutPairingInput): boolean {
  const predHome = predicted.home_team_id;
  const predAway = predicted.away_team_id;
  const predHomeScore = predicted.home_score;
  const predAwayScore = predicted.away_score;
  if (predHome === undefined || predAway === undefined) return false;
  if (predHomeScore === undefined || predAwayScore === undefined) return false;

  const samePairing =
    (predHome === actual.homeTeamId && predAway === actual.awayTeamId) ||
    (predHome === actual.awayTeamId && predAway === actual.homeTeamId);
  if (!samePairing) return false;

  const predGoalsForActualHome = predHome === actual.homeTeamId ? predHomeScore : predAwayScore;
  const predGoalsForActualAway = predHome === actual.homeTeamId ? predAwayScore : predHomeScore;
  if (predGoalsForActualHome !== actual.homeScore || predGoalsForActualAway !== actual.awayScore) {
    return false;
  }

  if (actual.homeScore === actual.awayScore) {
    const predWinnerTeam =
      predicted.penalty_winner === "home"
        ? predHome
        : predicted.penalty_winner === "away"
          ? predAway
          : undefined;
    const actualWinnerTeam =
      actual.penaltyWinner === "home"
        ? actual.homeTeamId
        : actual.penaltyWinner === "away"
          ? actual.awayTeamId
          : undefined;
    return predWinnerTeam !== undefined && predWinnerTeam === actualWinnerTeam;
  }

  return true;
}

export function scoreKnockoutExact(
  match: {
    id: number;
    match_number: number;
    stage: string;
    home_score: number;
    away_score: number;
    penalty_winner_team_id?: number | null;
    home_team_id: number;
    away_team_id: number;
  },
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  stageByMatchNumber: Map<number, string>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  const ruleKey = STAGE_RULE_MAP[match.stage];
  if (!ruleKey) return events;
  const pts = rules.get(ruleKey) || 0;
  if (pts <= 0) return events;

  const actual = {
    homeTeamId: match.home_team_id,
    awayTeamId: match.away_team_id,
    homeScore: match.home_score,
    awayScore: match.away_score,
    penaltyWinner:
      match.penalty_winner_team_id === match.home_team_id
        ? ("home" as Side)
        : match.penalty_winner_team_id === match.away_team_id
          ? ("away" as Side)
          : null,
  };

  for (const [userId, userBracket] of Array.from(predictedMatchesByUser.entries())) {
    const predicted = findUserPredictionForPairing(
      userBracket,
      stageByMatchNumber,
      match.stage,
      match.home_team_id,
      match.away_team_id
    );
    if (!predicted) continue;
    if (isKnockoutPairingExact({ actual, predicted })) {
      events.push({
        user_id: userId,
        match_id: match.id,
        rule_key: ruleKey,
        points: pts,
        description: `Exacto ${match.home_score}-${match.away_score} en ${STAGE_LABEL[match.stage]} P${match.match_number}`,
      });
    }
  }

  return events;
}
