"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";
import { StageBar } from "@/components/porra/stage-bar";
import { getTeams } from "@/lib/data/static-cache";
import { cn } from "@/lib/utils";
import { isPredictionsLocked } from "@/lib/predictions/lock";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string;
}

interface Standing {
  team_id: number;
  group_letter: string;
  position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
}

interface BestThirdOverride {
  team_id: number;
  rank: number;
}

interface ConfigRow {
  key: string;
  value: string;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const POSITION_STYLES: Record<number, string> = {
  1: "text-gold font-bold",
  2: "text-ink font-semibold",
  3: "text-blue font-semibold",
  4: "text-ink-faint",
};

const POSITION_LABELS: Record<number, string> = {
  1: "1º",
  2: "2º",
  3: "3º",
  4: "4º",
};

export default function ClasificadosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [bestThirdOverrides, setBestThirdOverrides] = useState<Map<number, number>>(new Map());
  const [userId, setUserId] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [pressingThirdId, setPressingThirdId] = useState<number | null>(null);
  const [draggingThirdId, setDraggingThirdId] = useState<number | null>(null);
  const [dropTargetThirdId, setDropTargetThirdId] = useState<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const thirdPressTimer = useRef<number | null>(null);
  const draggingThirdIdRef = useRef<number | null>(null);
  const dropTargetThirdIdRef = useRef<number | null>(null);
  const thirdRowRefs = useRef(new Map<number, HTMLDivElement>());
  const thirdDragRectsRef = useRef(new Map<number, DOMRect>());
  const thirdPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [teamsRes, standingsRes, bestThirdRes, configRes] = await Promise.all([
        getTeams(),
        supabase
          .from("predicted_group_standings")
          .select("*")
          .eq("user_id", user.id)
          .order("group_letter")
          .order("position"),
        supabase
          .from("predicted_best_third_order")
          .select("team_id, rank")
          .eq("user_id", user.id)
          .order("rank"),
        supabase.from("tournament_config").select("key, value"),
      ]);

      setTeams(teamsRes);
      setStandings(standingsRes.data || []);
      setIsLocked(isPredictionsLocked((configRes.data ?? []) as ConfigRow[]));
      setBestThirdOverrides(
        new Map(
          ((bestThirdRes.data || []) as BestThirdOverride[]).map((row) => [
            row.team_id,
            row.rank,
          ])
        )
      );
    }
    load();
  }, []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const thirdTieKey = (s: Standing) => `${s.points}:${s.goal_difference}:${s.goals_for}`;

  // Best thirds: FIFA calculable criteria are points > goal difference > goals for.
  const baseThirds = standings
    .filter((s) => s.position === 3)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference)
        return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });
  const tiedThirdKeys = new Set<string>();
  for (const third of baseThirds) {
    const key = thirdTieKey(third);
    if (baseThirds.filter((s) => thirdTieKey(s) === key).length > 1) {
      tiedThirdKeys.add(key);
    }
  }
  const thirds = [...baseThirds].sort((a, b) => {
    const statDiff =
      b.points - a.points ||
      b.goal_difference - a.goal_difference ||
      b.goals_for - a.goals_for;
    if (statDiff !== 0) return statDiff;
    return (
      (bestThirdOverrides.get(a.team_id) ?? Number.MAX_SAFE_INTEGER) -
        (bestThirdOverrides.get(b.team_id) ?? Number.MAX_SAFE_INTEGER) ||
      baseThirds.findIndex((s) => s.team_id === a.team_id) -
        baseThirds.findIndex((s) => s.team_id === b.team_id)
    );
  });
  const bestThirds = thirds.slice(0, 8);
  const bestThirdsSet = new Set(bestThirds.map((t) => t.team_id));
  const hasThirdTies = tiedThirdKeys.size > 0;

  const saveBestThirdOrder = useCallback(
    async (orderedThirds: Standing[]) => {
      if (!userId || isLocked) return;
      const rows = orderedThirds.map((third, index) => ({
        user_id: userId,
        team_id: third.team_id,
        rank: index + 1,
      }));
      await supabase.from("predicted_best_third_order").delete().eq("user_id", userId);
      if (rows.length > 0) {
        await supabase.from("predicted_best_third_order").insert(rows);
      }
    },
    [isLocked, supabase, userId]
  );

  const moveThird = useCallback(
    (teamId: number, direction: "up" | "down") => {
      const idx = thirds.findIndex((s) => s.team_id === teamId);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= thirds.length) return;
      if (thirdTieKey(thirds[idx]) !== thirdTieKey(thirds[swapIdx])) return;

      const next = [...thirds];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      setBestThirdOverrides(new Map(next.map((third, index) => [third.team_id, index + 1])));
      saveBestThirdOrder(next);
    },
    [saveBestThirdOrder, thirds]
  );

  const reorderThird = useCallback(
    (teamId: number, targetTeamId: number) => {
      const idx = thirds.findIndex((s) => s.team_id === teamId);
      const targetIdx = thirds.findIndex((s) => s.team_id === targetTeamId);
      if (idx < 0 || targetIdx < 0 || idx === targetIdx) return;
      if (thirdTieKey(thirds[idx]) !== thirdTieKey(thirds[targetIdx])) return;

      const next = [...thirds];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      setBestThirdOverrides(new Map(next.map((third, index) => [third.team_id, index + 1])));
      saveBestThirdOrder(next);
    },
    [saveBestThirdOrder, thirds]
  );

  const clearThirdPressTimer = useCallback(() => {
    if (thirdPressTimer.current !== null) {
      window.clearTimeout(thirdPressTimer.current);
      thirdPressTimer.current = null;
    }
  }, []);

  const endThirdDrag = useCallback(() => {
    const draggedTeamId = draggingThirdIdRef.current;
    const targetTeamId = dropTargetThirdIdRef.current;
    if (draggedTeamId && targetTeamId) {
      reorderThird(draggedTeamId, targetTeamId);
    }
    clearThirdPressTimer();
    draggingThirdIdRef.current = null;
    dropTargetThirdIdRef.current = null;
    thirdDragRectsRef.current.clear();
    thirdPressStartRef.current = null;
    setPressingThirdId(null);
    setDraggingThirdId(null);
    setDropTargetThirdId(null);
    setDragOffsetY(0);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.body.style.overflow = "";
    document.documentElement.style.touchAction = "";
  }, [clearThirdPressTimer, reorderThird]);

  useEffect(
    () => () => {
      clearThirdPressTimer();
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      document.body.style.overflow = "";
      document.documentElement.style.touchAction = "";
    },
    [clearThirdPressTimer]
  );

  const updateThirdDragTarget = useCallback(
    (clientY: number) => {
      const draggedTeamId = draggingThirdIdRef.current;
      if (!draggedTeamId) return;
      const dragged = thirds.find((s) => s.team_id === draggedTeamId);
      if (!dragged) return;

      let targetTeamId: number | null = null;
      for (const third of thirds) {
        if (third.team_id === draggedTeamId || thirdTieKey(third) !== thirdTieKey(dragged)) continue;
        const rect = thirdDragRectsRef.current.get(third.team_id);
        if (!rect) continue;
        if (clientY >= rect.top && clientY <= rect.bottom) {
          targetTeamId = third.team_id;
          break;
        }
      }
      const target = thirds.find((s) => s.team_id === targetTeamId);
      if (!target || targetTeamId === draggedTeamId || thirdTieKey(target) !== thirdTieKey(dragged)) {
        dropTargetThirdIdRef.current = null;
        setDropTargetThirdId(null);
        setDragOffsetY(0);
        return;
      }

      dropTargetThirdIdRef.current = targetTeamId;
      setDropTargetThirdId(targetTeamId);

      const draggedRect = thirdDragRectsRef.current.get(draggedTeamId);
      const targetRect = thirdDragRectsRef.current.get(targetTeamId!);
      if (draggedRect && targetRect) {
        setDragOffsetY(targetRect.top - draggedRect.top);
      }
    },
    [thirds]
  );

  useEffect(() => {
    if (draggingThirdId === null) return;

    const handleMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      updateThirdDragTarget(event.clientY);
    };
    const handleTouchMove = (event: globalThis.TouchEvent) => {
      event.preventDefault();
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (touch) updateThirdDragTarget(touch.clientY);
    };
    const handleEnd = () => endThirdDrag();

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
  }, [draggingThirdId, endThirdDrag, updateThirdDragTarget]);

  const startThirdPress = (teamId: number, event: PointerEvent<HTMLDivElement>) => {
    const third = thirds.find((s) => s.team_id === teamId);
    if (!third || isLocked || !tiedThirdKeys.has(thirdTieKey(third))) return;
    clearThirdPressTimer();
    setPressingThirdId(teamId);
    dropTargetThirdIdRef.current = null;
    thirdPressStartRef.current = { x: event.clientX, y: event.clientY };
    thirdPressTimer.current = window.setTimeout(() => {
      thirdDragRectsRef.current = new Map(
        Array.from(thirdRowRefs.current.entries()).map(([id, row]) => [id, row.getBoundingClientRect()])
      );
      draggingThirdIdRef.current = teamId;
      setDraggingThirdId(teamId);
      document.body.style.userSelect = "none";
      document.body.style.touchAction = "none";
      document.body.style.overflow = "hidden";
      document.documentElement.style.touchAction = "none";
      thirdPressTimer.current = null;
    }, 220);
  };

  const handleThirdPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const draggedTeamId = draggingThirdIdRef.current;
    if (!draggedTeamId) {
      const start = thirdPressStartRef.current;
      if (start && (Math.abs(event.clientX - start.x) > 8 || Math.abs(event.clientY - start.y) > 8)) {
        clearThirdPressTimer();
        thirdPressStartRef.current = null;
        setPressingThirdId(null);
      }
      return;
    }
    event.preventDefault();
    updateThirdDragTarget(event.clientY);
  };

  // Progress: a group is complete when it has at least 4 positioned teams saved
  const completedGroups = GROUPS.filter(
    (g) => standings.filter((s) => s.group_letter === g).length >= 4
  );
  const clasifPct = Math.round((completedGroups.length / 12) * 100);

  const isEmpty = standings.length === 0;

  return (
    <div className="pb-10">
      {/* Stage progress bar */}
      <StageBar progress={{ clasificados: clasifPct }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-4">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-none">
          Clasificados
        </h1>
        <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted">
          Los 2 primeros de cada grupo + 8 mejores terceros
        </p>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="mx-4 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-ink-muted mb-4">
            Primero completa los pronósticos de la fase de grupos y guarda las
            clasificaciones.
          </p>
          <Link
            href="/predicciones/grupos"
            className="inline-flex items-center gap-1 rounded-lg bg-ink px-4 py-2 font-marcador text-sm uppercase text-white transition-opacity hover:opacity-80"
          >
            Ir a Fase de Grupos ›
          </Link>
        </div>
      )}

      {/* Groups grid */}
      {!isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-4">
            {GROUPS.map((group) => {
              const groupStandings = standings
                .filter((s) => s.group_letter === group)
                .sort((a, b) => a.position - b.position);

              return (
                <div
                  key={group}
                  className="bg-surface border border-border rounded-xl overflow-hidden"
                >
                  {/* Group heading */}
                  <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
                    <span className="font-marcador text-sm uppercase text-ink-muted tracking-widest">
                      Grupo {group}
                    </span>
                    <Link
                      href="/predicciones/grupos"
                      className="text-[10px] font-bold uppercase tracking-wide text-blue hover:text-blue/70 transition-colors"
                    >
                      Editar resultados ›
                    </Link>
                  </div>

                  {/* Standings rows */}
                  <div className="px-3 pb-3 space-y-1">
                    {groupStandings.length === 0 ? (
                      <p className="text-xs text-ink-faint py-2">Sin datos</p>
                    ) : (
                      groupStandings.map((s) => {
                        const team = teamsMap.get(s.team_id);
                        const posStyle =
                          POSITION_STYLES[s.position] ?? "text-ink-faint";
                        const posLabel =
                          POSITION_LABELS[s.position] ?? `${s.position}º`;
                        const isQualifiedThird =
                          s.position === 3 && bestThirdsSet.has(s.team_id);

                        return (
                          <div
                            key={s.team_id}
                            className="flex items-center gap-2 py-1"
                          >
                            <span
                              className={`font-marcador text-sm w-5 shrink-0 ${posStyle}`}
                            >
                              {posLabel}
                            </span>
                            <Flag
                              emoji={team?.flag_emoji ?? ""}
                              size={18}
                              className="shrink-0"
                            />
                            <span className="text-sm text-ink truncate flex-1">
                              {team?.name ?? "—"}
                            </span>
                            {(s.position <= 2 || isQualifiedThird) && (
                              <span className="text-[10px] font-bold text-green shrink-0">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best thirds section */}
          <div className="mx-4 mt-6 bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <h2 className="font-marcador text-xl uppercase text-ink leading-none">
                8 Mejores Terceros
              </h2>
              <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted">
                Clasificados por puntos · diferencia de goles · goles a favor
              </p>
              {hasThirdTies && !isLocked && (
                <p className="mt-2 text-xs text-amber">
                  Hay empate total entre terceros tras criterios FIFA calculables. Mantén pulsado para arrastrar o usa las flechas.
                </p>
              )}
            </div>

            <div className="px-4 pb-4">
              {thirds.length === 0 ? (
                <p className="text-sm text-ink-faint py-2">
                  Sin datos de terceros clasificados
                </p>
              ) : (
                <div className="space-y-1">
                  {thirds.map((s, idx) => {
                    const team = teamsMap.get(s.team_id);
                    const qualifies = idx < 8;
                    const draggingIndex = thirds.findIndex((row) => row.team_id === draggingThirdId);
                    const targetIndex = thirds.findIndex((row) => row.team_id === dropTargetThirdId);
                    const targetShift =
                      draggingIndex >= 0 && targetIndex >= 0 && dropTargetThirdId === s.team_id
                        ? draggingIndex < targetIndex
                          ? -1
                          : 1
                        : 0;
                    return (
                      <div
                        key={s.team_id}
                        ref={(node) => {
                          if (node) thirdRowRefs.current.set(s.team_id, node);
                          else thirdRowRefs.current.delete(s.team_id);
                        }}
                        data-third-team-id={s.team_id}
                        onPointerDown={(event) => startThirdPress(s.team_id, event)}
                        onPointerMove={handleThirdPointerMove}
                        onPointerUp={endThirdDrag}
                        onPointerCancel={endThirdDrag}
                        style={{
                          transform:
                            draggingThirdId === s.team_id
                              ? `translateY(${dragOffsetY}px) scale(1.01)`
                              : targetShift !== 0
                                ? `translateY(${targetShift * 100}%)`
                                : undefined,
                        }}
                        className={cn(
                          "flex items-center gap-3 py-1.5 rounded-lg px-2 transition-[background,box-shadow,transform] duration-200",
                          qualifies && "bg-green/8",
                          tiedThirdKeys.has(thirdTieKey(s)) && "border-l-2 border-l-amber",
                          tiedThirdKeys.has(thirdTieKey(s)) && !isLocked && "cursor-grab select-none active:cursor-grabbing",
                          pressingThirdId === s.team_id && "ring-2 ring-amber/40",
                          draggingThirdId === s.team_id && "relative z-10 bg-amber/15 shadow-md",
                          dropTargetThirdId === s.team_id && "bg-amber/[0.18]"
                        )}
                      >
                        <span
                          className={`font-marcador text-sm w-5 shrink-0 ${
                            qualifies ? "text-green font-bold" : "text-ink-faint"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <Flag
                          emoji={team?.flag_emoji ?? ""}
                          size={18}
                          className="shrink-0"
                        />
                        <span className="text-sm text-ink flex-1 truncate">
                          {team?.name ?? "—"}
                        </span>
                        <span className="text-[10px] text-ink-muted font-mono shrink-0">
                          Gr.{s.group_letter}
                        </span>
                        <span className="text-[10px] font-bold text-ink-muted shrink-0 w-12 text-right">
                          {s.points}pts · {s.goal_difference > 0 ? "+" : ""}
                          {s.goal_difference}
                        </span>
                        {tiedThirdKeys.has(thirdTieKey(s)) && !isLocked && (
                          <span className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveThird(s.team_id, "up");
                              }}
                              disabled={
                                idx === 0 ||
                                thirdTieKey(thirds[idx - 1]) !== thirdTieKey(s)
                              }
                              className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                              aria-label={`Subir ${team?.name ?? "equipo"}`}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                moveThird(s.team_id, "down");
                              }}
                              disabled={
                                idx === thirds.length - 1 ||
                                thirdTieKey(thirds[idx + 1]) !== thirdTieKey(s)
                              }
                              className="rounded p-0.5 text-ink-muted transition-colors hover:text-ink disabled:opacity-30"
                              aria-label={`Bajar ${team?.name ?? "equipo"}`}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                        {qualifies && (
                          <span className="text-[10px] font-bold text-green shrink-0">
                            ✓
                          </span>
                        )}
                        {!qualifies && (
                          <span className="text-[10px] text-ink-faint shrink-0">
                            ✕
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="mx-4 mt-4 flex justify-between gap-3">
            <Link
              href="/predicciones/grupos"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-4 py-2 font-marcador text-sm uppercase text-ink transition-colors hover:bg-surface-sunken"
            >
              ← Fase de Grupos
            </Link>
            <Link
              href="/predicciones/eliminatorias"
              className="inline-flex items-center gap-1 rounded-lg bg-ink px-4 py-2 font-marcador text-sm uppercase text-white transition-opacity hover:opacity-80"
            >
              Eliminatorias →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
