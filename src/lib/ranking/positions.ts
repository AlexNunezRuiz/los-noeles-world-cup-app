export type Positioned<T> = T & { position: number };

export function assignCompetitionPositions<T>(
  entries: T[],
  getPoints: (entry: T) => number
): Array<Positioned<T>> {
  let previousPoints: number | null = null;
  let currentPosition = 0;

  return entries.map((entry, index) => {
    const points = getPoints(entry);

    if (previousPoints === null || points !== previousPoints) {
      currentPosition = index + 1;
      previousPoints = points;
    }

    return {
      ...entry,
      position: currentPosition,
    };
  });
}
