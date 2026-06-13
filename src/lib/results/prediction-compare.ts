import { stageLabel } from "@/lib/tournament/labels";
import { isCompetitionParticipant } from "@/lib/users/participation";

export interface ProfileForRanking {
  id: string;
  display_name: string;
  has_paid: boolean;
  is_active?: boolean | null;
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

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

export function getPredictionCompareLoadPlan(
  isLocked: boolean,
  selectedMatchId: number | null
) {
  if (!isLocked || selectedMatchId === null) return null;
  return { matchId: selectedMatchId };
}

export function sortProfilesByCurrentRanking(
  profiles: ProfileForRanking[],
  scores: ScoreForRanking[],
  currentUserId: string | null
): RankedPredictionProfile[] {
  const scoreMap = new Map(scores.map((score) => [score.user_id, score.total_points]));
  const activeProfiles = profiles.filter((profile) => profile.is_active !== false);
  const paidProfiles = activeProfiles.filter(isCompetitionParticipant);
  const unpaidProfiles = activeProfiles.filter((profile) => !profile.has_paid);

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

export function filterRankedPredictionProfiles<T extends RankedPredictionProfile>(
  profiles: T[],
  query: string
) {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return profiles;

  return profiles.filter((profile) => {
    const haystack = normalizeSearchText(
      [
        profile.display_name,
        profile.rank ? `#${profile.rank} ${profile.rank}` : "",
        `${profile.totalPoints} pts puntos`,
        profile.has_paid ? "pagado registrado" : "pendiente pago sin pagar",
        profile.isCurrentUser ? "tu yo mi" : "",
      ].join(" ")
    );

    return terms.every((term) => haystack.includes(term));
  });
}
