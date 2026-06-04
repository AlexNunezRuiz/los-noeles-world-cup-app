import { stageLabel } from "@/lib/tournament/labels";

export interface ProfileForRanking {
  id: string;
  display_name: string;
  has_paid: boolean;
}

export interface ScoreForRanking {
  user_id: string;
  total_points: number;
}

export interface RankedPredictionProfile extends ProfileForRanking {
  rank: number | null;
  totalPoints: number;
  isCurrentUser: boolean;
}

export function buildMatchSearchLabel({
  match_number,
  stage,
  group_letter,
  homeName,
  awayName,
}: {
  match_number: number;
  stage: string;
  group_letter: string | null;
  homeName: string;
  awayName: string;
}) {
  return `${homeName} - ${awayName} · ${stageLabel(stage, group_letter)} · P${String(
    match_number
  ).padStart(2, "0")}`;
}

export function getInitialSelectedMatchId(
  matchIds: number[],
  requestedMatchId: string | null
) {
  if (matchIds.length === 0) return null;

  const parsed = requestedMatchId ? Number(requestedMatchId) : NaN;
  if (Number.isInteger(parsed) && matchIds.includes(parsed)) {
    return parsed;
  }

  return matchIds[0];
}

export function sortProfilesByCurrentRanking(
  profiles: ProfileForRanking[],
  scores: ScoreForRanking[],
  currentUserId: string | null
): RankedPredictionProfile[] {
  const scoreMap = new Map(scores.map((score) => [score.user_id, score.total_points]));
  const paidProfiles = profiles.filter((profile) => profile.has_paid);
  const unpaidProfiles = profiles.filter((profile) => !profile.has_paid);

  const rankedPaid = paidProfiles
    .map((profile) => ({
      ...profile,
      totalPoints: scoreMap.get(profile.id) ?? 0,
      isCurrentUser: profile.id === currentUserId,
      rank: 0,
    }))
    .sort((a, b) => {
      const pointsDiff = b.totalPoints - a.totalPoints;
      if (pointsDiff !== 0) return pointsDiff;
      return a.display_name.localeCompare(b.display_name, "es");
    });

  let previousPoints: number | null = null;
  let previousRank = 0;
  return [
    ...rankedPaid.map((profile, index) => {
      const rank =
        previousPoints === profile.totalPoints ? previousRank : index + 1;
      previousPoints = profile.totalPoints;
      previousRank = rank;
      return { ...profile, rank };
    }),
    ...unpaidProfiles
      .map((profile) => ({
        ...profile,
        totalPoints: scoreMap.get(profile.id) ?? 0,
        isCurrentUser: profile.id === currentUserId,
        rank: null,
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name, "es")),
  ];
}
