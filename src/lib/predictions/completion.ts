export type PorraPhaseState = "empty" | "partial" | "complete";

export interface PorraPhaseCompletion {
  completed: number;
  total: number;
  state: PorraPhaseState;
  label: string;
}

export interface PorraCompletionInput {
  groupPredictionCount: number;
  groupStandingRows: number;
  knockoutPredictionCount: number;
  awardPredictionCount: number;
}

export interface PorraCompletion {
  grupos: PorraPhaseCompletion;
  clasificados: PorraPhaseCompletion;
  cuadro: PorraPhaseCompletion;
  premios: PorraPhaseCompletion;
}

function phase(completed: number, total: number): PorraPhaseCompletion {
  const safeCompleted = Math.min(Math.max(Math.floor(completed || 0), 0), total);
  return {
    completed: safeCompleted,
    total,
    state: safeCompleted === 0 ? "empty" : safeCompleted === total ? "complete" : "partial",
    label: `${safeCompleted}/${total}`,
  };
}

export function getPorraCompletion(input: PorraCompletionInput): PorraCompletion {
  return {
    grupos: phase(input.groupPredictionCount, 72),
    clasificados: phase(Math.floor(input.groupStandingRows / 4), 12),
    cuadro: phase(input.knockoutPredictionCount, 32),
    premios: phase(input.awardPredictionCount, 3),
  };
}
