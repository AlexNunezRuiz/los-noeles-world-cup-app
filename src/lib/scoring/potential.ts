export interface PredictedMilestone {
  teamId: number;
  ruleKey: string;
  round: string;
}

export interface AwardPotentialPrediction {
  awardType: string;
  playerId: number | null;
  playerName?: string | null;
}

export interface ActualAwardResult {
  awardType: string;
  playerId: number | null;
  playerName?: string | null;
}

export interface PotentialInput {
  currentPoints: number;
  rules: Map<string, number>;
  predictedMilestones: PredictedMilestone[];
  conflicts: number[][];
  eliminatedTeamIds: Set<number>;
  awardPredictions: AwardPotentialPrediction[];
  actualAwards: ActualAwardResult[];
}

export interface PotentialSummary {
  maximumPotentialPoints: number;
  semifinalistsEliminated: number;
  finalistsEliminated: number;
}

function awardMatches(prediction: AwardPotentialPrediction, actual: ActualAwardResult): boolean {
  if (prediction.playerId !== null && actual.playerId !== null) return prediction.playerId === actual.playerId;
  if (prediction.playerName && actual.playerName) {
    return prediction.playerName.trim().toLowerCase() === actual.playerName.trim().toLowerCase();
  }
  return false;
}

function conflictGroups(conflicts: number[][]): Map<number, string> {
  const map = new Map<number, string>();
  conflicts.forEach((group, index) => {
    for (const teamId of group) map.set(teamId, `group:${index}`);
  });
  return map;
}

export function calculatePotentialSummary(input: PotentialInput): PotentialSummary {
  const groupByTeam = conflictGroups(input.conflicts);
  const independent: PredictedMilestone[] = [];
  const grouped = new Map<string, PredictedMilestone[]>();

  for (const milestone of input.predictedMilestones) {
    if (input.eliminatedTeamIds.has(milestone.teamId)) continue;
    const group = groupByTeam.get(milestone.teamId);
    if (!group) {
      independent.push(milestone);
      continue;
    }
    const list = grouped.get(group) ?? [];
    list.push(milestone);
    grouped.set(group, list);
  }

  let potential = 0;
  for (const milestone of independent) potential += input.rules.get(milestone.ruleKey) ?? 0;

  for (const group of Array.from(grouped.values())) {
    const byTeam = new Map<number, number>();
    for (const milestone of group) {
      byTeam.set(milestone.teamId, (byTeam.get(milestone.teamId) ?? 0) + (input.rules.get(milestone.ruleKey) ?? 0));
    }
    potential += Math.max(0, ...Array.from(byTeam.values()));
  }

  for (const prediction of input.awardPredictions) {
    const points = input.rules.get(prediction.awardType) ?? 0;
    const actual = input.actualAwards.find((award) => award.awardType === prediction.awardType);
    if (!actual || awardMatches(prediction, actual)) potential += points;
  }

  return {
    maximumPotentialPoints: input.currentPoints + potential,
    semifinalistsEliminated: new Set(
      input.predictedMilestones
        .filter((milestone) => milestone.round === "semi_final" && input.eliminatedTeamIds.has(milestone.teamId))
        .map((milestone) => milestone.teamId)
    ).size,
    finalistsEliminated: new Set(
      input.predictedMilestones
        .filter(
          (milestone) =>
            (milestone.round === "final" || milestone.round === "champion") &&
            input.eliminatedTeamIds.has(milestone.teamId)
        )
        .map((milestone) => milestone.teamId)
    ).size,
  };
}
