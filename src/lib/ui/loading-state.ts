export function shouldShowEmptyState(isLoading: boolean, itemCount: number) {
  return !isLoading && itemCount === 0;
}
