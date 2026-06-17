export interface RecalculationResult<TEvent> {
  success: boolean;
  error?: string;
  events?: TEvent[];
}

export async function runRecalculationBeforeNotifications<TEvent>({
  recalculate,
  publishNotifications,
  onRecalculateError,
  onNotificationError,
}: {
  recalculate: () => Promise<RecalculationResult<TEvent>>;
  publishNotifications: (result: RecalculationResult<TEvent> & { success: true }) => Promise<void>;
  onRecalculateError: (error?: string) => void;
  onNotificationError: (error: unknown) => void;
}) {
  const result = await recalculate();

  if (!result.success) {
    onRecalculateError(result.error);
    return { recalculated: false, result };
  }

  const successfulResult = { ...result, success: true as const };

  try {
    await publishNotifications(successfulResult);
  } catch (error) {
    onNotificationError(error);
  }

  return { recalculated: true, result: successfulResult };
}
