export function isMissingProfilesColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  const message = String((error as { message?: unknown }).message);

  return /Could not find the '.+' column of 'profiles' in the schema cache/i.test(message);
}
