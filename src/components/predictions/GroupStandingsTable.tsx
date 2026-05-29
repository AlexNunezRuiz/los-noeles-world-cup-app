"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
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
  onReorderTeam?: (teamId: number, targetTeamId: number) => void;
}

export function GroupStandingsTable({
  standings,
  teams,
  tiedTeamIds,
  isLocked,
  onMoveTeam,
  onReorderTeam,
}: Props) {
  const [pressingTeamId, setPressingTeamId] = useState<number | null>(null);
  const [draggingTeamId, setDraggingTeamId] = useState<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const draggingTeamIdRef = useRef<number | null>(null);
  const lastTargetTeamIdRef = useRef<number | null>(null);
  const canDrag = !isLocked && tiedTeamIds.length > 0 && onReorderTeam !== undefined;

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    clearPressTimer();
    draggingTeamIdRef.current = null;
    lastTargetTeamIdRef.current = null;
    setDraggingTeamId(null);
    setPressingTeamId(null);
    document.body.style.userSelect = "";
  }, [clearPressTimer]);

  useEffect(
    () => () => {
      clearPressTimer();
      document.body.style.userSelect = "";
    },
    [clearPressTimer]
  );

  const startPress = (teamId: number, event: PointerEvent<HTMLTableRowElement>) => {
    if (!canDrag || !tiedTeamIds.includes(teamId)) return;
    clearPressTimer();
    setPressingTeamId(teamId);
    lastTargetTeamIdRef.current = teamId;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    pressTimer.current = window.setTimeout(() => {
      draggingTeamIdRef.current = teamId;
      setDraggingTeamId(teamId);
      document.body.style.userSelect = "none";
      pressTimer.current = null;
    }, 220);
  };

  const handlePointerMove = (event: PointerEvent<HTMLTableRowElement>) => {
    const draggedTeamId = draggingTeamIdRef.current;
    if (!draggedTeamId || !onReorderTeam) return;
    event.preventDefault();

    const targetRow = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)
      ?.closest<HTMLTableRowElement>("[data-team-id]");
    const targetTeamId = Number(targetRow?.dataset.teamId);
    if (
      !targetTeamId ||
      targetTeamId === draggedTeamId ||
      targetTeamId === lastTargetTeamIdRef.current ||
      !tiedTeamIds.includes(targetTeamId)
    ) {
      return;
    }

    lastTargetTeamIdRef.current = targetTeamId;
    onReorderTeam(draggedTeamId, targetTeamId);
  };

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
                data-team-id={s.team_id}
                onPointerDown={(event) => startPress(s.team_id, event)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={cn(
                  "border-b border-border text-ink last:border-b-0 transition-[background,box-shadow,transform]",
                  isTied && "bg-amber/[0.08] border-l-2 border-l-amber",
                  isTied && canDrag && "cursor-grab select-none active:cursor-grabbing",
                  pressingTeamId === s.team_id && "ring-2 ring-amber/40",
                  draggingTeamId === s.team_id && "relative z-10 scale-[1.01] bg-amber/15 shadow-md",
                  draggingTeamId !== null && isTied && draggingTeamId !== s.team_id && "bg-amber/[0.12]",
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
          Empate total tras criterios FIFA calculables. Mantén pulsado un equipo para arrastrarlo o usa las flechas.
        </p>
      )}
    </div>
  );
}
