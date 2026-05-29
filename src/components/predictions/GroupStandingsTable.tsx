"use client";

import { cn } from "@/lib/utils";
import type { TeamStanding } from "@/lib/tournament/standings";
import { Flag } from "@/components/ui/flag";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

interface Props {
  standings: TeamStanding[];
  teams: Map<number, Team>;
  tiedTeamIds: number[];
  isLocked: boolean;
  onMoveTeam?: (teamId: number, direction: "up" | "down") => void;
}

export function GroupStandingsTable({ standings, teams, tiedTeamIds, isLocked, onMoveTeam }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-sunken border-b border-border">
            <th className="text-left py-2 px-2 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">#</th>
            <th className="text-left py-2 px-2 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">Equipo</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">PJ</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">G</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">E</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">P</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">GF</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">GC</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">DG</th>
            <th className="text-center py-2 px-1 font-marcador font-semibold text-[10px] uppercase tracking-wide text-ink-faint">Pts</th>
            {!isLocked && tiedTeamIds.length > 0 && <th className="w-16"></th>}
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const team = teams.get(s.team_id);
            const isTied = tiedTeamIds.includes(s.team_id);
            const qualifies = s.position <= 2;

            return (
              <tr
                key={s.team_id}
                className={cn(
                  "border-b border-border text-ink last:border-b-0",
                  isTied && "bg-amber/[0.08] border-l-2 border-l-amber",
                  !isTied && qualifies && "border-l-2 border-l-green"
                )}
              >
                <td className="py-2 px-2">
                  <span className={cn(
                    "font-marcador font-bold text-sm",
                    qualifies ? "text-green" : "text-ink-faint"
                  )}>
                    {s.position}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <Flag emoji={team?.flag_emoji || ""} size={18} />
                    <span className="font-sans font-medium truncate text-ink">{team?.name}</span>
                  </div>
                </td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.played}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.won}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.drawn}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.lost}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.goals_for}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.goals_against}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}</td>
                <td className="text-center py-2 px-1 font-marcador font-bold text-ink">{s.points}</td>
                {!isLocked && tiedTeamIds.length > 0 && (
                  <td className="py-2 px-1">
                    {isTied && onMoveTeam && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => onMoveTeam(s.team_id, "up")}
                          className="p-0.5 text-ink-muted hover:text-ink transition-colors"
                          disabled={s.position === 1}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onMoveTeam(s.team_id, "down")}
                          className="p-0.5 text-ink-muted hover:text-ink transition-colors"
                          disabled={s.position === 4}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {tiedTeamIds.length > 0 && !isLocked && (
        <p className="text-xs text-amber px-3 py-2">
          Empate total tras criterios FIFA calculables. Usa las flechas para definir el orden.
        </p>
      )}
    </div>
  );
}
