"use client";

import { cn } from "@/lib/utils";
import type { TeamStanding } from "@/lib/tournament/standings";
import { ArrowUp, ArrowDown } from "lucide-react";

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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left py-2 px-1">#</th>
            <th className="text-left py-2 px-1">Equipo</th>
            <th className="text-center py-2 px-1">PJ</th>
            <th className="text-center py-2 px-1">G</th>
            <th className="text-center py-2 px-1">E</th>
            <th className="text-center py-2 px-1">P</th>
            <th className="text-center py-2 px-1">GF</th>
            <th className="text-center py-2 px-1">GC</th>
            <th className="text-center py-2 px-1">DG</th>
            <th className="text-center py-2 px-1 font-bold">Pts</th>
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
                  "border-b border-border/50",
                  isTied && "bg-[hsl(var(--gold))]/10",
                  qualifies && "bg-primary/5"
                )}
              >
                <td className="py-2 px-1">
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
                    s.position <= 2 && "bg-primary/20 text-primary",
                    s.position === 3 && "bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))]"
                  )}>
                    {s.position}
                  </span>
                </td>
                <td className="py-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span>{team?.flag_emoji}</span>
                    <span className="font-medium truncate">{team?.name}</span>
                  </div>
                </td>
                <td className="text-center py-2 px-1">{s.played}</td>
                <td className="text-center py-2 px-1">{s.won}</td>
                <td className="text-center py-2 px-1">{s.drawn}</td>
                <td className="text-center py-2 px-1">{s.lost}</td>
                <td className="text-center py-2 px-1">{s.goals_for}</td>
                <td className="text-center py-2 px-1">{s.goals_against}</td>
                <td className="text-center py-2 px-1">{s.goal_difference > 0 ? `+${s.goal_difference}` : s.goal_difference}</td>
                <td className="text-center py-2 px-1 font-bold">{s.points}</td>
                {!isLocked && tiedTeamIds.length > 0 && (
                  <td className="py-2 px-1">
                    {isTied && onMoveTeam && (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => onMoveTeam(s.team_id, "up")}
                          className="p-0.5 hover:text-primary"
                          disabled={s.position === 1}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onMoveTeam(s.team_id, "down")}
                          className="p-0.5 hover:text-primary"
                          disabled={s.position === 4}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
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
        <p className="text-xs text-[hsl(var(--gold))] mt-2">
          Hay equipos empatados. Usa las flechas para definir el orden.
        </p>
      )}
    </div>
  );
}
