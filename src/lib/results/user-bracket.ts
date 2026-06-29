import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

export interface PredictedStandingRow {
  group_letter: string;
  team_id: number;
  position: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
}

export interface BestThirdOrderRow {
  team_id: number;
  rank: number;
}

export interface UserPredictionRow {
  match_number: number;
  home_score: number;
  away_score: number;
  penalty_winner: "home" | "away" | null;
}

export interface BuildUserBracketInput {
  baseMatches: Array<{ match_number: number; stage: string; home_placeholder?: string | null; away_placeholder?: string | null }>;
  predictedStandings: PredictedStandingRow[];
  bestThirdOrder: BestThirdOrderRow[];
  predictions: UserPredictionRow[];
  bracketPositions: Array<{
    match_number: number;
    slot: "home" | "away";
    source_type: string;
    source_group?: string;
    source_match_number?: number;
    best_third_pool?: string;
  }>;
}

export interface BuiltUserBracket {
  byMatchNumber: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber: Map<number, string>;
}

export function buildUserBracket(input: BuildUserBracketInput): BuiltUserBracket {
  const { baseMatches, predictedStandings, bestThirdOrder, predictions, bracketPositions } = input;

  const groupStandings = new Map<string, TeamStanding[]>();
  for (const row of predictedStandings) {
    const standings = groupStandings.get(row.group_letter) ?? [];
    standings.push({
      team_id: row.team_id,
      position: row.position,
      points: row.points,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: row.goals_for,
      goals_against: row.goals_against,
      goal_difference: row.goal_difference,
    });
    standings.sort((a, b) => a.position - b.position);
    groupStandings.set(row.group_letter, standings);
  }

  const manualOrder = new Map<number, number>();
  for (const row of bestThirdOrder) manualOrder.set(row.team_id, row.rank);

  const predictionMap = new Map<number, KnockoutPrediction>();
  for (const p of predictions) {
    predictionMap.set(p.match_number, {
      match_id: 0,
      match_number: p.match_number,
      home_score: p.home_score,
      away_score: p.away_score,
      penalty_winner: p.penalty_winner ?? undefined,
    });
  }

  const base: BracketMatch[] = baseMatches.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder ?? undefined,
    away_placeholder: m.away_placeholder ?? undefined,
  }));

  const populated = populateKnockoutBracket(
    groupStandings,
    getBestThirds(groupStandings, manualOrder),
    base,
    predictionMap,
    bracketPositions
  );

  const byMatchNumber = new Map<number, PredictedKnockoutMatch>();
  const stageByMatchNumber = new Map<number, string>();
  for (const m of populated) {
    byMatchNumber.set(m.match_number, {
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_score: m.home_score,
      away_score: m.away_score,
      penalty_winner: m.penalty_winner,
    });
    stageByMatchNumber.set(m.match_number, m.stage);
  }
  return { byMatchNumber, stageByMatchNumber };
}
