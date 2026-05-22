"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";
import { StageBar } from "@/components/porra/stage-bar";
import { getTeams } from "@/lib/data/static-cache";

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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [teamsRes, standingsRes] = await Promise.all([
        getTeams(),
        supabase
          .from("predicted_group_standings")
          .select("*")
          .eq("user_id", user.id)
          .order("group_letter")
          .order("position"),
      ]);

      setTeams(teamsRes);
      setStandings(standingsRes.data || []);
    }
    load();
  }, []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  // Best thirds: 3rd-placed teams ranked by points > goal_difference > goals_for, top 8 qualify
  const thirds = standings
    .filter((s) => s.position === 3)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference)
        return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });
  const bestThirds = thirds.slice(0, 8);
  const bestThirdsSet = new Set(bestThirds.map((t) => t.team_id));

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
                    return (
                      <div
                        key={s.team_id}
                        className={`flex items-center gap-3 py-1.5 rounded-lg px-2 ${
                          qualifies ? "bg-green/8" : ""
                        }`}
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
                        {qualifies && (
                          <span className="text-[10px] font-bold text-green shrink-0">
                            ✓
                          </span>
                        )}
                        {!qualifies && (
                          <span className="text-[10px] text-ink-faint shrink-0">
                            ✗
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
