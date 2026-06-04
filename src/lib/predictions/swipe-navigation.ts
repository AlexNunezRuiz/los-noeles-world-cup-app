export type SwipeDirection = "next" | "previous";

interface SwipeInput {
  deltaX: number;
  deltaY: number;
  minDistance?: number;
  horizontalBias?: number;
}

export const PREDICTION_STAGE_HREFS = [
  "/predicciones/grupos",
  "/predicciones/clasificados",
  "/predicciones/eliminatorias",
  "/predicciones/premios",
] as const;

export type PredictionStageHref = (typeof PREDICTION_STAGE_HREFS)[number];

export function getSwipeDirection({
  deltaX,
  deltaY,
  minDistance = 70,
  horizontalBias = 1.5,
}: SwipeInput): SwipeDirection | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX < minDistance || absX < absY * horizontalBias) {
    return null;
  }

  return deltaX < 0 ? "next" : "previous";
}

export function getAdjacentPredictionStage(
  pathname: string,
  direction: SwipeDirection
): PredictionStageHref | null {
  const currentIndex = PREDICTION_STAGE_HREFS.findIndex((href) =>
    pathname.startsWith(href)
  );
  if (currentIndex === -1) return null;

  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  return PREDICTION_STAGE_HREFS[nextIndex] ?? null;
}
