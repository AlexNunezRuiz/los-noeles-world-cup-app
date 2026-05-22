"use client";

import { CalendarMatchRow, type CalendarMatch } from "./calendar-match-row";
import type { DayGroup } from "@/lib/datetime";

export function CalendarDayGroup({
  group,
  isToday,
}: {
  group: DayGroup<CalendarMatch>;
  isToday?: boolean;
}) {
  return (
    <section data-day={group.key}>
      <div className="sticky top-14 z-10 -mx-1 bg-cream/95 px-1 py-1.5 backdrop-blur">
        <h2 className="flex items-center gap-2 font-marcador text-sm font-bold uppercase text-ink">
          {group.label}
          {isToday && (
            <span className="rounded bg-red px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
              Hoy
            </span>
          )}
        </h2>
      </div>
      <div className="mt-1 space-y-2">
        {group.matches.map((m) => (
          <CalendarMatchRow key={m.id} match={m} />
        ))}
      </div>
    </section>
  );
}
