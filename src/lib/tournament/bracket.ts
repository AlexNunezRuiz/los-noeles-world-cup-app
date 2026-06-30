import type { TeamStanding } from "./standings";
import { allocateThirdPlaces } from "./third-place-allocation";

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

// Build a map from team_id -> group letter using the group standings
function buildTeamGroupMap(groupStandings: Map<string, TeamStanding[]>): Map<number, string> {
  const map = new Map<number, string>();
  for (const [group, standings] of Array.from(groupStandings.entries())) {
    for (const s of standings) {
      map.set(s.team_id, group);
    }
  }
  return map;
}

// Assign best-third-placed teams to bracket slots with pool constraints.
// Each slot has a pool string like "A,B,C,D,F" — the assigned team's group
// must appear in that pool. Uses a greedy approach (ranked by performance)
// with fallback to any remaining unassigned team if no pool match exists.
function assignBestThirds(
  bestThirds: TeamStanding[],
  slots: Array<{ pool: string }>,
  teamGroupMap: Map<number, string>
): (number | undefined)[] {
  const remaining = [...bestThirds];
  const assigned: (number | undefined)[] = new Array(slots.length).fill(undefined);

  for (let i = 0; i < slots.length; i++) {
    const poolGroups = new Set(slots[i].pool.split(",").map((g) => g.trim()));
    // Find the best remaining team whose group is in this pool
    const idx = remaining.findIndex((t) => {
      const grp = teamGroupMap.get(t.team_id);
      return grp !== undefined && poolGroups.has(grp);
    });
    if (idx !== -1) {
      assigned[i] = remaining[idx].team_id;
      remaining.splice(idx, 1);
    }
  }

  // Fallback: fill still-empty slots with remaining teams in order
  let fallbackIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    if (assigned[i] === undefined && fallbackIdx < remaining.length) {
      assigned[i] = remaining[fallbackIdx].team_id;
      fallbackIdx++;
    }
  }

  return assigned;
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
  }>,
  // Only the REAL bracket uses the official FIFA allocation table. User-predicted
  // brackets keep the historical ranking-based placement (their porras were made
  // and scored against it; changing it would misalign their knockout picks).
  useOfficialThirdAllocation = false
): BracketMatch[] {
  const matchMap = new Map<number, BracketMatch>();
  for (const m of knockoutMatches) {
    matchMap.set(m.match_number, { ...m });
  }

  // Build team->group lookup for best-third assignment
  const teamGroupMap = buildTeamGroupMap(groupStandings);

  // Collect all best_third slots in bracket order
  const bestThirdSlots = bracketPositions
    .filter((bp) => bp.source_type === "best_third" && bp.best_third_pool)
    .map((bp) => ({ matchNumber: bp.match_number, slot: bp.slot, pool: bp.best_third_pool! }));

  const bestThirdMap = new Map<string, number | undefined>();

  // Official FIFA allocation: each third-placed team is assigned by GROUP,
  // deterministically from the set of 8 qualifying third-place groups (not by
  // ranking). Falls back to the pool-aware greedy when the group stage is
  // incomplete (fewer than 8 thirds / unknown combination).
  const qualifyingThirdGroups = bestThirds
    .map((t) => teamGroupMap.get(t.team_id))
    .filter((g): g is string => g !== undefined);
  const allocation = useOfficialThirdAllocation ? allocateThirdPlaces(qualifyingThirdGroups) : null;

  if (allocation) {
    // Map each best_third slot to the third of the group the table assigns to
    // that slot's home group winner.
    const winnerGroupByMatch = new Map<number, string>();
    for (const bp of bracketPositions) {
      if (bp.source_type === "group_winner" && bp.source_group) {
        winnerGroupByMatch.set(bp.match_number, bp.source_group);
      }
    }
    for (const s of bestThirdSlots) {
      const winnerGroup = winnerGroupByMatch.get(s.matchNumber);
      const thirdGroup = winnerGroup ? allocation[winnerGroup] : undefined;
      const teamId = thirdGroup
        ? groupStandings.get(thirdGroup)?.find((st) => st.position === 3)?.team_id
        : undefined;
      bestThirdMap.set(`${s.matchNumber}:${s.slot}`, teamId);
    }
  } else {
    const bestThirdAssignments = assignBestThirds(bestThirds, bestThirdSlots, teamGroupMap);
    bestThirdSlots.forEach((s, i) => {
      bestThirdMap.set(`${s.matchNumber}:${s.slot}`, bestThirdAssignments[i]);
    });
  }

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
      teamId = bestThirdMap.get(`${bp.match_number}:${bp.slot}`);
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
