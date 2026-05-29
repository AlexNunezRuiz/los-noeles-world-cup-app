export interface MatchResult {
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
}

export interface TeamStanding {
  team_id: number;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  head_to_head_points?: number;
  head_to_head_goal_difference?: number;
  head_to_head_goals_for?: number;
  unresolved_tie_key?: string;
}

function applyMatchToStanding(
  standing: TeamStanding,
  goalsFor: number,
  goalsAgainst: number
) {
  standing.played++;
  standing.goals_for += goalsFor;
  standing.goals_against += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    standing.won++;
    standing.points += 3;
  } else if (goalsFor < goalsAgainst) {
    standing.lost++;
  } else {
    standing.drawn++;
    standing.points += 1;
  }
}

function calculateHeadToHeadStats(
  tiedIds: number[],
  matches: MatchResult[]
): Map<number, Pick<TeamStanding, "points" | "goals_for" | "goal_difference">> {
  const tiedSet = new Set(tiedIds);
  const stats = new Map<number, TeamStanding>();

  for (const id of tiedIds) {
    stats.set(id, {
      team_id: id,
      position: 0,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
    });
  }

  for (const match of matches) {
    if (!tiedSet.has(match.home_team_id) || !tiedSet.has(match.away_team_id)) continue;

    const home = stats.get(match.home_team_id);
    const away = stats.get(match.away_team_id);
    if (!home || !away) continue;

    applyMatchToStanding(home, match.home_score, match.away_score);
    applyMatchToStanding(away, match.away_score, match.home_score);
  }

  for (const standing of Array.from(stats.values())) {
    standing.goal_difference = standing.goals_for - standing.goals_against;
  }

  return new Map(
    Array.from(stats.entries()).map(([teamId, standing]) => [
      teamId,
      {
        points: standing.points,
        goals_for: standing.goals_for,
        goal_difference: standing.goal_difference,
      },
    ])
  );
}

export function calculateGroupStandings(
  teamIds: number[],
  matches: MatchResult[]
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>();

  for (const id of teamIds) {
    standings.set(id, {
      team_id: id,
      position: 0,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
    });
  }

  for (const match of matches) {
    const home = standings.get(match.home_team_id);
    const away = standings.get(match.away_team_id);
    if (!home || !away) continue;

    applyMatchToStanding(home, match.home_score, match.away_score);
    applyMatchToStanding(away, match.away_score, match.home_score);
  }

  // Calculate GD
  Array.from(standings.values()).forEach((s) => {
    s.goal_difference = s.goals_for - s.goals_against;
  });

  const sorted: TeamStanding[] = [];
  const byPoints = new Map<number, TeamStanding[]>();

  for (const standing of Array.from(standings.values())) {
    const group = byPoints.get(standing.points) ?? [];
    group.push(standing);
    byPoints.set(standing.points, group);
  }

  const pointGroups = Array.from(byPoints.entries()).sort(([a], [b]) => b - a);

  for (const [, group] of pointGroups) {
    if (group.length === 1) {
      sorted.push(group[0]);
      continue;
    }

    const tiedIds = group.map((s) => s.team_id);
    const headToHead = calculateHeadToHeadStats(tiedIds, matches);

    for (const standing of group) {
      const h2h = headToHead.get(standing.team_id);
      standing.head_to_head_points = h2h?.points ?? 0;
      standing.head_to_head_goal_difference = h2h?.goal_difference ?? 0;
      standing.head_to_head_goals_for = h2h?.goals_for ?? 0;
    }

    group.sort((a, b) => {
      if ((b.head_to_head_points ?? 0) !== (a.head_to_head_points ?? 0)) {
        return (b.head_to_head_points ?? 0) - (a.head_to_head_points ?? 0);
      }
      if ((b.head_to_head_goal_difference ?? 0) !== (a.head_to_head_goal_difference ?? 0)) {
        return (b.head_to_head_goal_difference ?? 0) - (a.head_to_head_goal_difference ?? 0);
      }
      if ((b.head_to_head_goals_for ?? 0) !== (a.head_to_head_goals_for ?? 0)) {
        return (b.head_to_head_goals_for ?? 0) - (a.head_to_head_goals_for ?? 0);
      }
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return a.team_id - b.team_id;
    });

    let i = 0;
    while (i < group.length) {
      let j = i + 1;
      const tieKey = getUnresolvedGroupTieKey(group[i]);
      while (j < group.length && getUnresolvedGroupTieKey(group[j]) === tieKey) {
        j++;
      }
      if (j - i > 1) {
        for (const standing of group.slice(i, j)) {
          standing.unresolved_tie_key = tieKey;
        }
      }
      i = j;
    }

    sorted.push(...group);
  }

  sorted.forEach((s, i) => {
    s.position = i + 1;
  });

  return sorted;
}

function getUnresolvedGroupTieKey(s: TeamStanding): string {
  return [
    s.points,
    s.head_to_head_points ?? 0,
    s.head_to_head_goal_difference ?? 0,
    s.head_to_head_goals_for ?? 0,
    s.goal_difference,
    s.goals_for,
  ].join(":");
}

export function findTiedTeams(standings: TeamStanding[]): number[][] {
  const ties: number[][] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (
      j < standings.length &&
      standings[j].unresolved_tie_key !== undefined &&
      standings[j].unresolved_tie_key === standings[i].unresolved_tie_key
    ) {
      j++;
    }
    if (j - i > 1 && standings[i].unresolved_tie_key !== undefined) {
      ties.push(standings.slice(i, j).map((s) => s.team_id));
    }
    i = j;
  }
  return ties;
}

export function getBestThirds(
  allGroupStandings: Map<string, TeamStanding[]>,
  manualOrder?: Map<number, number>
): TeamStanding[] {
  const thirds: TeamStanding[] = [];
  Array.from(allGroupStandings.values()).forEach((standings) => {
    const third = standings.find((s: TeamStanding) => s.position === 3);
    if (third) thirds.push(third);
  });

  // Sort by points DESC, GD DESC, GF DESC
  thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return (
      (manualOrder?.get(a.team_id) ?? Number.MAX_SAFE_INTEGER) -
        (manualOrder?.get(b.team_id) ?? Number.MAX_SAFE_INTEGER) ||
      a.team_id - b.team_id
    );
  });

  return thirds.slice(0, 8); // Best 8 thirds from 12 groups
}
