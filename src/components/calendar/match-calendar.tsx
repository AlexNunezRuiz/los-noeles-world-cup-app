"use client";

import { groupByMatchDay, todayKey } from "@/lib/datetime";
import { CalendarDayGroup } from "./calendar-day-group";
import type { CalendarMatch } from "./calendar-match-row";

export function MatchCalendar({ matches }: { matches: CalendarMatch[] }) {
  const groups = groupByMatchDay(matches);
  const today = todayKey();

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-muted">
        No hay partidos que coincidan con el filtro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <CalendarDayGroup key={g.key} group={g} isToday={g.key === today} />
      ))}
    </div>
  );
}
