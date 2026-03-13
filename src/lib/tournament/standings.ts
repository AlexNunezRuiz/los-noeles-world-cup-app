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

    home.played++;
    away.played++;
    home.goals_for += match.home_score;
    home.goals_against += match.away_score;
    away.goals_for += match.away_score;
    away.goals_against += match.home_score;

    if (match.home_score > match.away_score) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (match.home_score < match.away_score) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  // Calculate GD
  Array.from(standings.values()).forEach((s) => {
    s.goal_difference = s.goals_for - s.goals_against;
  });

  // Sort: points DESC, GD DESC, GF DESC
  const sorted = Array.from(standings.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    return b.goals_for - a.goals_for;
  });

  sorted.forEach((s, i) => {
    s.position = i + 1;
  });

  return sorted;
}

export function findTiedTeams(standings: TeamStanding[]): number[][] {
  const ties: number[][] = [];
  let i = 0;
  while (i < standings.length) {
    let j = i + 1;
    while (
      j < standings.length &&
      standings[j].points === standings[i].points &&
      standings[j].goal_difference === standings[i].goal_difference &&
      standings[j].goals_for === standings[i].goals_for
    ) {
      j++;
    }
    if (j - i > 1) {
      ties.push(standings.slice(i, j).map((s) => s.team_id));
    }
    i = j;
  }
  return ties;
}

export function getBestThirds(
  allGroupStandings: Map<string, TeamStanding[]>
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
    return b.goals_for - a.goals_for;
  });

  return thirds.slice(0, 8); // Best 8 thirds from 12 groups
}
