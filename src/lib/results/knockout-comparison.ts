import { findUserPredictionForPairing, isKnockoutPairingExact } from "@/lib/scoring/knockout";
import { didPredictTeamInStage, didPredictTeamWinStage, type PredictedKnockoutMatch } from "@/lib/scoring/qualification";

export interface CompareInput {
  userBracket: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
  stage: string;
  realHomeTeamId: number;
  realAwayTeamId: number;
  realHomeScore: number;
  realAwayScore: number;
  realPenaltyWinnerTeamId: number | null;
}

interface TeamFlag {
  inRound: boolean;
  advances: boolean;
}

export type PairingComparison =
  | { kind: "exact"; predHome: number; predAway: number }
  | { kind: "pairing"; predHome: number; predAway: number }
  | { kind: "teams"; home: TeamFlag; away: TeamFlag };

export function compareRealMatchToUser(input: CompareInput): PairingComparison {
  const {
    userBracket,
    stageByMatchNumber,
    stage,
    realHomeTeamId,
    realAwayTeamId,
    realHomeScore,
    realAwayScore,
    realPenaltyWinnerTeamId,
  } = input;

  const predicted = findUserPredictionForPairing(userBracket, stageByMatchNumber, stage, realHomeTeamId, realAwayTeamId);

  if (predicted && predicted.home_team_id !== undefined && predicted.away_team_id !== undefined && predicted.home_score !== undefined && predicted.away_score !== undefined) {
    const predHome = predicted.home_team_id === realHomeTeamId ? predicted.home_score : predicted.away_score;
    const predAway = predicted.home_team_id === realHomeTeamId ? predicted.away_score : predicted.home_score;
    const exact = isKnockoutPairingExact({
      actual: {
        homeTeamId: realHomeTeamId,
        awayTeamId: realAwayTeamId,
        homeScore: realHomeScore,
        awayScore: realAwayScore,
        penaltyWinner:
          realPenaltyWinnerTeamId === realHomeTeamId
            ? "home"
            : realPenaltyWinnerTeamId === realAwayTeamId
              ? "away"
              : null,
      },
      predicted,
    });
    return { kind: exact ? "exact" : "pairing", predHome, predAway };
  }

  const matchMeta = Array.from(stageByMatchNumber.entries()).map(([match_number, s]) => ({ match_number, stage: s }));
  const flag = (teamId: number): TeamFlag => ({
    inRound: didPredictTeamInStage(matchMeta, userBracket, stage, teamId),
    advances: didPredictTeamWinStage(matchMeta, userBracket, stage, teamId),
  });
  return { kind: "teams", home: flag(realHomeTeamId), away: flag(realAwayTeamId) };
}
