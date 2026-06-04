// Formateo de fechas de partido en hora de España (Europe/Madrid).
// Los match_date llegan en UTC; Intl gestiona el horario de verano (CEST).

const MADRID = "Europe/Madrid";

/** "19:00" — hora de inicio en España. */
export function formatKickoff(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** "Jueves 11 jun" — cabecera de día. */
export function formatMatchDay(iso: string): string {
  const s = new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    weekday: "long",
    day: "numeric",
    month: "short",
  })
    .format(new Date(iso))
    .replace(",", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "11 jun" — día corto, para tarjetas compactas. */
export function formatShortDay(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID,
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

/** Clave AAAA-MM-DD del día del partido en hora de España (para agrupar). */
export function matchDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** Clave del día de hoy en hora de España. */
export function todayKey(): string {
  return matchDayKey(new Date().toISOString());
}

export function isoToDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function datetimeLocalValueToIso(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
}

export interface DayGroup<T> {
  key: string;
  label: string;
  matches: T[];
}

/** Agrupa partidos por día (España), conservando el orden cronológico. */
export function groupByMatchDay<T extends { match_date: string }>(
  matches: T[]
): DayGroup<T>[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );
  const groups: DayGroup<T>[] = [];
  for (const m of sorted) {
    const key = matchDayKey(m.match_date);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: formatMatchDay(m.match_date), matches: [] };
      groups.push(g);
    }
    g.matches.push(m);
  }
  return groups;
}
