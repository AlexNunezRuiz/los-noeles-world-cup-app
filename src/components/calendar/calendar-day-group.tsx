"use client";

import { CalendarMatchRow, type CalendarMatch } from "./calendar-match-row";
import type { DayGroup } from "@/lib/datetime";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";
import type { PronosticoCruceTeam } from "@/components/results/pronostico-cruce";

export function CalendarDayGroup({
  group,
  isToday,
  bracket,
  stageByMatchNumber,
  teams,
}: {
  group: DayGroup<CalendarMatch>;
  isToday?: boolean;
  bracket?: Map<number, PredictedKnockoutMatch>;
  stageByMatchNumber?: Map<number, string>;
  teams?: Map<number, PronosticoCruceTeam>;
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
          <CalendarMatchRow key={m.id} match={m} bracket={bracket} stageByMatchNumber={stageByMatchNumber} teams={teams} />
        ))}
      </div>
    </section>
  );
}
