export function getDragRowShift<T>(
  orderedIds: T[],
  draggingId: T | null,
  dropTargetId: T | null,
  rowId: T
) {
  const draggingIndex = orderedIds.findIndex((id) => id === draggingId);
  const targetIndex = orderedIds.findIndex((id) => id === dropTargetId);
  const rowIndex = orderedIds.findIndex((id) => id === rowId);

  if (draggingIndex < 0 || targetIndex < 0 || rowIndex < 0 || draggingIndex === targetIndex) {
    return 0;
  }

  if (draggingIndex < targetIndex) {
    return rowIndex > draggingIndex && rowIndex <= targetIndex ? -1 : 0;
  }

  return rowIndex >= targetIndex && rowIndex < draggingIndex ? 1 : 0;
}
