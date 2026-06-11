interface ConfigRow {
  key: string;
  value: string;
}

type ConfigMap = Record<string, string>;

export function configRowsToRecord(rows: ConfigRow[]): ConfigMap {
  const config: ConfigMap = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export function applyPredictionLockConfigChange(config: ConfigMap, row: ConfigRow): ConfigMap {
  return { ...config, [row.key]: row.value };
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

export function canEditPredictions(isLocked: boolean) {
  return !isLocked;
}
