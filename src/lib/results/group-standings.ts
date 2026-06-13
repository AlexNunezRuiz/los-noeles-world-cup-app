import { calculateGroupStandings, type MatchResult, type TeamStanding } from "@/lib/tournament/standings";

export interface GroupStandingTeam {
  id: number;
  name: string;
  flag_emoji: string;
  group_letter: string | null;
}

export interface GroupStandingMatch {
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

export function buildRealGroupStandings(
  teams: GroupStandingTeam[],
  matches: GroupStandingMatch[]
): Map<string, TeamStanding[]> {
  const teamIdsByGroup = new Map<string, number[]>();

  for (const team of teams) {
    if (!team.group_letter) continue;
    const groupTeams = teamIdsByGroup.get(team.group_letter) ?? [];
    groupTeams.push(team.id);
    teamIdsByGroup.set(team.group_letter, groupTeams);
  }

  const matchResultsByGroup = new Map<string, MatchResult[]>();
  for (const match of matches) {
    if (
      !match.group_letter ||
      !match.is_finished ||
      match.home_team_id === null ||
      match.away_team_id === null ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const groupMatches = matchResultsByGroup.get(match.group_letter) ?? [];
    groupMatches.push({
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      home_score: match.home_score,
      away_score: match.away_score,
    });
    matchResultsByGroup.set(match.group_letter, groupMatches);
  }

  return new Map(
    Array.from(teamIdsByGroup.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([groupLetter, teamIds]) => [
        groupLetter,
        calculateGroupStandings(teamIds, matchResultsByGroup.get(groupLetter) ?? []),
      ])
  );
}
