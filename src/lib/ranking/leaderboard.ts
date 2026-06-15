import { assignCompetitionPositions } from "@/lib/ranking/positions";
import { isCompetitionParticipant } from "@/lib/users/participation";

export interface RankingLeaderboardProfile {
  id: string;
  display_name: string;
  has_paid: boolean;
  is_active?: boolean | null;
}

export interface RankingLeaderboardScore {
  user_id: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
}

export interface RankingLeaderboardEntry {
  position: number;
  user_id: string;
  name: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
  isYou: boolean;
}

const EMPTY_SCORE = {
  total_points: 0,
  group_stage_points: 0,
  knockout_exact_points: 0,
  qualification_points: 0,
  award_points: 0,
};

export function buildRankingLeaderboard({
  profiles,
  scores,
  currentUserId,
}: {
  profiles: RankingLeaderboardProfile[];
  scores: RankingLeaderboardScore[];
  currentUserId: string | null;
}): RankingLeaderboardEntry[] {
  const scoreByUserId = new Map(scores.map((score) => [score.user_id, score]));
  const entries = profiles
    .filter(isCompetitionParticipant)
    .map((profile) => {
      const score = scoreByUserId.get(profile.id) ?? EMPTY_SCORE;

      return {
        position: 0,
        user_id: profile.id,
        name: profile.display_name,
        total_points: score.total_points,
        group_stage_points: score.group_stage_points,
        knockout_exact_points: score.knockout_exact_points,
        qualification_points: score.qualification_points,
        award_points: score.award_points,
        isYou: profile.id === currentUserId,
      };
    })
    .sort((a, b) => {
      const pointsDiff = b.total_points - a.total_points;
      if (pointsDiff !== 0) return pointsDiff;
      return a.name.localeCompare(b.name, "es");
    });

  return assignCompetitionPositions(entries, (entry) => entry.total_points);
}
