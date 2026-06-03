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
  const [dropTargetTeamId, setDropTargetTeamId] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const pressTimer = useRef<number | null>(null);
  const draggingTeamIdRef = useRef<number | null>(null);
  const dropTargetTeamIdRef = useRef<number | null>(null);
  const rowRefs = useRef(new Map<number, HTMLTableRowElement>());
  const dragRectsRef = useRef(new Map<number, DOMRect>());
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);
  const canDrag = !isLocked && tiedTeamIds.length > 0 && onReorderTeam !== undefined;

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    const draggedTeamId = draggingTeamIdRef.current;
    const targetTeamId = dropTargetTeamIdRef.current;
    if (draggedTeamId && targetTeamId && draggedTeamId !== targetTeamId && onReorderTeam) {
      onReorderTeam(draggedTeamId, targetTeamId);
    }
    clearPressTimer();
    draggingTeamIdRef.current = null;
    dropTargetTeamIdRef.current = null;
    dragRectsRef.current.clear();
    pressStartRef.current = null;
    setDraggingTeamId(null);
    setDropTargetTeamId(null);
    setDragOffsetY(0);
    setPressingTeamId(null);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.body.style.overflow = "";
    document.documentElement.style.touchAction = "";
  }, [clearPressTimer, onReorderTeam]);

  useEffect(
    () => () => {
      clearPressTimer();
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      document.body.style.overflow = "";
      document.documentElement.style.touchAction = "";
    },
    [clearPressTimer]
  );

  const updateDragTarget = useCallback(
    (clientY: number) => {
      const draggedTeamId = draggingTeamIdRef.current;
      if (!draggedTeamId || !onReorderTeam) return;

      let targetTeamId: number | null = null;
      for (const teamId of tiedTeamIds) {
        if (teamId === draggedTeamId) continue;
        const rect = dragRectsRef.current.get(teamId);
        if (!rect) continue;
        if (clientY >= rect.top && clientY <= rect.bottom) {
          targetTeamId = teamId;
          break;
        }
      }
      if (
        !targetTeamId ||
        targetTeamId === draggedTeamId ||
        !tiedTeamIds.includes(targetTeamId)
      ) {
        dropTargetTeamIdRef.current = null;
        setDropTargetTeamId(null);
        setDragOffsetY(0);
        return;
      }

      dropTargetTeamIdRef.current = targetTeamId;
      setDropTargetTeamId(targetTeamId);

      const draggedRect = dragRectsRef.current.get(draggedTeamId);
      const targetRect = dragRectsRef.current.get(targetTeamId);
      if (draggedRect && targetRect) {
        setDragOffsetY(targetRect.top - draggedRect.top);
      }
    },
    [onReorderTeam, tiedTeamIds]
  );

  useEffect(() => {
    if (draggingTeamId === null) return;

    const handleMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      updateDragTarget(event.clientY);
    };
    const handleTouchMove = (event: globalThis.TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (touch) updateDragTarget(touch.clientY);
    };
    const handleEnd = () => endDrag();

    window.addEventListener("pointermove", handleMove, { passive: false });
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    window.addEventListener("touchcancel", handleEnd);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [draggingTeamId, endDrag, updateDragTarget]);

  const startPress = (teamId: number, event: PointerEvent<HTMLTableRowElement>) => {
    if (!canDrag || !tiedTeamIds.includes(teamId)) return;
    clearPressTimer();
    setPressingTeamId(teamId);
    dropTargetTeamIdRef.current = null;
    pressStartRef.current = { x: event.clientX, y: event.clientY };

    pressTimer.current = window.setTimeout(() => {
      dragRectsRef.current = new Map(
        Array.from(rowRefs.current.entries()).map(([id, row]) => [id, row.getBoundingClientRect()])
      );
      draggingTeamIdRef.current = teamId;
      setDraggingTeamId(teamId);
      document.body.style.userSelect = "none";
      document.body.style.touchAction = "none";
      document.body.style.overflow = "hidden";
      document.documentElement.style.touchAction = "none";
      pressTimer.current = null;
    }, 220);
  };

  const handlePointerMove = (event: PointerEvent<HTMLTableRowElement>) => {
    const draggedTeamId = draggingTeamIdRef.current;
    if (!draggedTeamId) {
      const start = pressStartRef.current;
      if (start && (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8)) {
        clearPressTimer();
        pressStartRef.current = null;
        setPressingTeamId(null);
      }
      return;
    }
    if (!onReorderTeam) return;
    event.preventDefault();
    updateDragTarget(event.clientY);
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
          {standings.map((s, rowIndex) => {
            const team = teams.get(s.team_id);
            const isTied = tiedTeamIds.includes(s.team_id);
            const qualifies = s.position <= 2;
            const draggingIndex = standings.findIndex((row) => row.team_id === draggingTeamId);
            const targetIndex = standings.findIndex((row) => row.team_id === dropTargetTeamId);
            const targetShift =
              draggingIndex >= 0 && targetIndex >= 0 && dropTargetTeamId === s.team_id
                ? draggingIndex < targetIndex
                  ? -1
                  : 1
                : 0;

            return (
              <tr
                key={s.team_id}
                ref={(node) => {
                  if (node) rowRefs.current.set(s.team_id, node);
                  else rowRefs.current.delete(s.team_id);
                }}
                data-team-id={s.team_id}
                onPointerDown={(event) => startPress(s.team_id, event)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                style={{
                  transform:
                    draggingTeamId === s.team_id
                      ? `translateY(${dragOffsetY}px) scale(1.01)`
                      : targetShift !== 0
                        ? `translateY(${targetShift * 100}%)`
                        : undefined,
                }}
                className={cn(
                  "border-b border-border text-ink last:border-b-0 transition-[background,box-shadow,transform] duration-200",
                  isTied && "bg-amber/[0.08] border-l-2 border-l-amber",
                  isTied && canDrag && "cursor-grab select-none active:cursor-grabbing",
                  pressingTeamId === s.team_id && "ring-2 ring-amber/40",
                  draggingTeamId === s.team_id && "relative z-10 bg-amber/15 shadow-md",
                  dropTargetTeamId === s.team_id && "bg-amber/[0.18]",
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
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveTeam(s.team_id, "up");
                          }}
                          className="p-0.5 text-ink-muted hover:text-ink transition-colors"
                          disabled={
                            rowIndex === 0 || !tiedTeamIds.includes(standings[rowIndex - 1]?.team_id)
                          }
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveTeam(s.team_id, "down");
                          }}
                          className="p-0.5 text-ink-muted hover:text-ink transition-colors"
                          disabled={
                            rowIndex === standings.length - 1 ||
                            !tiedTeamIds.includes(standings[rowIndex + 1]?.team_id)
                          }
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
