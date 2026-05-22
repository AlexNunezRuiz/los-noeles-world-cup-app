"use client";

import { Flag } from "@/components/ui/flag";
import { formatShortDay, formatKickoff } from "@/lib/datetime";
import { stageLabel } from "@/lib/tournament/labels";
import type {
  CalendarMatch,
  CalendarTeam,
} from "@/components/calendar/calendar-match-row";

function TeamLine({
  team,
  placeholder,
}: {
  team: CalendarTeam | null;
  placeholder: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {team ? (
        <>
          <Flag emoji={team.flag_emoji} size={16} />
          <span className="truncate text-xs font-bold text-ink">
            {team.name}
          </span>
        </>
      ) : (
        <span className="truncate font-marcador text-[10px] uppercase text-ink-faint">
          {placeholder ?? "—"}
        </span>
      )}
    </div>
  );
}

export function UpcomingStrip({
  matches,
  limit = 5,
}: {
  matches: CalendarMatch[];
  limit?: number;
}) {
  const upcoming = matches
    .filter((m) => !m.is_finished)
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    )
    .slice(0, limit);

  if (upcoming.length === 0) return null;

  return (
    <div>
      <p className="px-1 pb-1.5 font-sans text-[9px] font-bold uppercase tracking-widest text-ink-faint">
        Próximos partidos
      </p>
      <div className="flex gap-2 overflow-x-auto px-1 pb-1">
        {upcoming.map((m) => (
          <div
            key={m.id}
            className="w-[150px] shrink-0 rounded-xl border border-border bg-surface p-2.5"
          >
            <p className="font-marcador text-[11px] font-bold uppercase text-ink">
              {formatShortDay(m.match_date)} · {formatKickoff(m.match_date)}
            </p>
            <p className="mt-0.5 font-sans text-[8px] font-bold uppercase tracking-widest text-ink-faint">
              {stageLabel(m.stage, m.group_letter)}
            </p>
            <div className="mt-1.5 space-y-1">
              <TeamLine team={m.home} placeholder={m.home_placeholder} />
              <TeamLine team={m.away} placeholder={m.away_placeholder} />
            </div>
            {m.venue && (
              <p className="mt-1.5 truncate border-t border-dashed border-border pt-1.5 text-[9px] text-ink-muted">
                {m.venue.city}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
