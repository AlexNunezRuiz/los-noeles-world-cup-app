interface ConfigRow {
  key: string;
  value: string;
}

export function isPredictionsLocked(config: ConfigRow[] | Record<string, string>, now = new Date()) {
  const valueFor = Array.isArray(config)
    ? (key: string) => config.find((row) => row.key === key)?.value
    : (key: string) => config[key];

  if (valueFor("predictions_locked") === "true") return true;

  const lockDatetime = valueFor("lock_datetime");
  if (!lockDatetime) return false;

  const lockDate = new Date(lockDatetime);
  if (Number.isNaN(lockDate.getTime())) return false;

  return now >= lockDate;
}
