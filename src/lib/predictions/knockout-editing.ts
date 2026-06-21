export type KnockoutEditingSide = "home" | "away";

export interface KnockoutEditingState {
  editing: { matchNum: number; side: KnockoutEditingSide } | null;
  awaitingWinnerMatch: number | null;
}

export function isCompleteKnockoutPrediction(
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
  penaltyWinner?: KnockoutEditingSide | null
): boolean {
  if (homeScore === null || homeScore === undefined) return false;
  if (awayScore === null || awayScore === undefined) return false;
  return homeScore !== awayScore || penaltyWinner === "home" || penaltyWinner === "away";
}

export function getKnockoutEditingViewState(
  state: KnockoutEditingState,
  matchNumber: number,
  isCompleteDraw = false
) {
  const isEditingMatch = state.editing?.matchNum === matchNumber;

  return {
    selected: isEditingMatch || state.awaitingWinnerMatch === matchNumber || isCompleteDraw,
    focusedSide: isEditingMatch ? state.editing?.side ?? null : null,
    scorePadOpen: state.editing !== null,
  };
}
