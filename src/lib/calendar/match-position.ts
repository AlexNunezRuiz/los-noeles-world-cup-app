import { matchDayKey } from "@/lib/datetime";

export interface CalendarPositionMatch {
  match_number: number;
  match_date: string | null;
  is_finished: boolean;
}

export function sortMatchesByCalendar<T extends CalendarPositionMatch>(matches: T[]): T[] {
  return [...matches].sort((a, b) => {
    const aTime = a.match_date ? new Date(a.match_date).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.match_date ? new Date(b.match_date).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    return a.match_number - b.match_number;
  });
}

export function getAutoScrollDay(
  matches: CalendarPositionMatch[],
  today = matchDayKey(new Date().toISOString())
): string | null {
  const dated = sortMatchesByCalendar(matches).filter((match) => match.match_date);
  if (dated.length === 0) return null;

  const days = dated.map((match) => matchDayKey(match.match_date as string));
  if (days.includes(today)) return today;

  const finishedOnOrBeforeToday = dated.filter(
    (match) => match.is_finished && matchDayKey(match.match_date as string) <= today
  );
  if (finishedOnOrBeforeToday.length > 0) {
    return matchDayKey(finishedOnOrBeforeToday[finishedOnOrBeforeToday.length - 1].match_date as string);
  }

  const next = dated.find((match) => matchDayKey(match.match_date as string) >= today);
  return next?.match_date ? matchDayKey(next.match_date) : matchDayKey(dated[dated.length - 1].match_date as string);
}
