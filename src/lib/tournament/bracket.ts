import type { TeamStanding } from "./standings";

export interface BracketMatch {
  match_number: number;
  stage: string;
  home_team_id?: number;
  away_team_id?: number;
  home_placeholder?: string;
  away_placeholder?: string;
  home_score?: number;
  away_score?: number;
  penalty_winner?: "home" | "away";
}

export interface KnockoutPrediction {
  match_id: number;
  match_number: number;
  home_score: number;
  away_score: number;
  penalty_winner?: "home" | "away";
}

export function getMatchWinner(
  match: { home_score: number; away_score: number; penalty_winner?: "home" | "away" },
  homeTeamId?: number,
  awayTeamId?: number
): number | undefined {
  if (homeTeamId === undefined || awayTeamId === undefined) return undefined;

  if (match.home_score > match.away_score) return homeTeamId;
  if (match.away_score > match.home_score) return awayTeamId;

  // Draw - use penalty winner
  if (match.penalty_winner === "home") return homeTeamId;
  if (match.penalty_winner === "away") return awayTeamId;

  return undefined;
}

export function getMatchLoser(
  match: { home_score: number; away_score: number; penalty_winner?: "home" | "away" },
  homeTeamId?: number,
  awayTeamId?: number
): number | undefined {
  const winner = getMatchWinner(match, homeTeamId, awayTeamId);
  if (winner === undefined || homeTeamId === undefined || awayTeamId === undefined) return undefined;
  return winner === homeTeamId ? awayTeamId : homeTeamId;
}

export function populateKnockoutBracket(
  groupStandings: Map<string, TeamStanding[]>,
  bestThirds: TeamStanding[],
  knockoutMatches: BracketMatch[],
  predictions: Map<number, KnockoutPrediction>,
  bracketPositions: Array<{
    match_number: number;
    slot: "home" | "away";
    source_type: string;
    source_group?: string;
    source_match_number?: number;
    best_third_pool?: string;
  }>
): BracketMatch[] {
  const matchMap = new Map<number, BracketMatch>();
  for (const m of knockoutMatches) {
    matchMap.set(m.match_number, { ...m });
  }

  // Track best thirds assigned
  const bestThirdsCopy = [...bestThirds];
  let bestThirdIndex = 0;

  // First pass: populate from group results
  for (const bp of bracketPositions) {
    const match = matchMap.get(bp.match_number);
    if (!match) continue;

    let teamId: number | undefined;

    if (bp.source_type === "group_winner" && bp.source_group) {
      const gs = groupStandings.get(bp.source_group);
      teamId = gs?.find((s) => s.position === 1)?.team_id;
    } else if (bp.source_type === "group_runner_up" && bp.source_group) {
      const gs = groupStandings.get(bp.source_group);
      teamId = gs?.find((s) => s.position === 2)?.team_id;
    } else if (bp.source_type === "best_third") {
      if (bestThirdIndex < bestThirdsCopy.length) {
        teamId = bestThirdsCopy[bestThirdIndex]?.team_id;
        bestThirdIndex++;
      }
    }

    if (teamId !== undefined) {
      if (bp.slot === "home") match.home_team_id = teamId;
      else match.away_team_id = teamId;
    }
  }

  // Subsequent passes: populate from match results (cascading)
  const stages = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

  for (let i = 0; i < stages.length; i++) {
    // Apply user predictions and cascade winners
    for (const [matchNum, match] of Array.from(matchMap.entries())) {
      if (match.home_team_id && match.away_team_id) {
        const pred = predictions.get(matchNum);
        if (pred) {
          match.home_score = pred.home_score;
          match.away_score = pred.away_score;
          match.penalty_winner = pred.penalty_winner;
        }
      }
    }

    // Cascade to next stage
    for (const bp of bracketPositions) {
      if (bp.source_type === "match_winner" && bp.source_match_number) {
        const sourceMatch = matchMap.get(bp.source_match_number);
        if (!sourceMatch || sourceMatch.home_score === undefined || sourceMatch.away_score === undefined) continue;

        const winnerId = getMatchWinner(
          { home_score: sourceMatch.home_score, away_score: sourceMatch.away_score, penalty_winner: sourceMatch.penalty_winner },
          sourceMatch.home_team_id,
          sourceMatch.away_team_id
        );

        const targetMatch = matchMap.get(bp.match_number);
        if (targetMatch && winnerId !== undefined) {
          if (bp.slot === "home") targetMatch.home_team_id = winnerId;
          else targetMatch.away_team_id = winnerId;
        }
      } else if (bp.source_type === "match_loser" && bp.source_match_number) {
        const sourceMatch = matchMap.get(bp.source_match_number);
        if (!sourceMatch || sourceMatch.home_score === undefined || sourceMatch.away_score === undefined) continue;

        const loserId = getMatchLoser(
          { home_score: sourceMatch.home_score, away_score: sourceMatch.away_score, penalty_winner: sourceMatch.penalty_winner },
          sourceMatch.home_team_id,
          sourceMatch.away_team_id
        );

        const targetMatch = matchMap.get(bp.match_number);
        if (targetMatch && loserId !== undefined) {
          if (bp.slot === "home") targetMatch.home_team_id = loserId;
          else targetMatch.away_team_id = loserId;
        }
      }
    }
  }

  return Array.from(matchMap.values()).sort((a, b) => a.match_number - b.match_number);
}
