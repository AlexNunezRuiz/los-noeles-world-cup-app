export interface CalendarPredictionSource {
  match_id: number;
  home_score: number;
  away_score: number;
}

export interface CalendarPrediction {
  home: number;
  away: number;
}

export function attachPredictionsToCalendarMatches<T extends { id: number }>(
  matches: T[],
  predictions: CalendarPredictionSource[]
): Array<T & { prediction: CalendarPrediction | null }> {
  const predictionByMatchId = new Map(
    predictions.map((prediction) => [
      prediction.match_id,
      { home: prediction.home_score, away: prediction.away_score },
    ])
  );

  return matches.map((match) => ({
    ...match,
    prediction: predictionByMatchId.get(match.id) ?? null,
  }));
}
