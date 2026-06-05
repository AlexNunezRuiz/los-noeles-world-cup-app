export type KnockoutEditingSide = "home" | "away";

export interface KnockoutEditingState {
  editing: { matchNum: number; side: KnockoutEditingSide } | null;
  awaitingWinnerMatch: number | null;
}

export function getKnockoutEditingViewState(
  state: KnockoutEditingState,
  matchNumber: number
) {
  const isEditingMatch = state.editing?.matchNum === matchNumber;

  return {
    selected: isEditingMatch || state.awaitingWinnerMatch === matchNumber,
    focusedSide: isEditingMatch ? state.editing?.side ?? null : null,
    scorePadOpen: state.editing !== null,
  };
}
