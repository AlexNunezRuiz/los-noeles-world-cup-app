"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { RankingList, RankingRow } from "@/components/ranking/ranking-list";
import { Podium } from "@/components/ranking/podium";
import { BreakdownBar } from "@/components/ranking/breakdown-bar";
import {
  getPorraCompletion,
  type PorraCompletion,
  type PorraPhaseState,
} from "@/lib/predictions/completion";
import { assignCompetitionPositions } from "@/lib/ranking/positions";
import {
  filterRankingSearchTargets,
  getRankingSearchSuggestions,
  type RankingSearchTarget,
} from "@/lib/ranking/search";
import { cn } from "@/lib/utils";
import { shouldShowEmptyState } from "@/lib/ui/loading-state";
import { isCompetitionParticipant } from "@/lib/users/participation";

interface UserScoreRow {
  user_id: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
}

interface ProfileRow {
  id: string;
  display_name: string;
  has_paid: boolean;
  is_active?: boolean | null;
}

interface CompletionStatusRow {
  user_id: string;
  group_prediction_count: number;
  group_standing_rows: number;
  knockout_prediction_count: number;
  award_prediction_count: number;
}

interface LeaderboardEntry {
  position: number;
  user_id: string;
  name: string;
  total_points: number;
  group_stage_points: number;
  knockout_exact_points: number;
  qualification_points: number;
  award_points: number;
  isYou: boolean;
}

type TabMode = "lista" | "podio" | "estado";

function buildGapInfo(
  entries: LeaderboardEntry[],
  youIdx: number
): string {
  const you = entries[youIdx];
  const above = youIdx > 0 ? entries[youIdx - 1] : null;
  const below = youIdx < entries.length - 1 ? entries[youIdx + 1] : null;

  const parts: string[] = [];

  if (above) {
    const gap = above.total_points - you.total_points;
    const pos = above.position;
    parts.push(`A ${gap} del ${pos}º`);
  }

  if (below) {
    const gap = you.total_points - below.total_points;
    parts.push(`te persigue ${below.name} a ${gap}`);
  }

  return parts.join(" · ");
}

export default function RankingPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [allProfiles, setAllProfiles] = useState<ProfileRow[]>([]);
  const [completionByUser, setCompletionByUser] = useState<Map<string, PorraCompletion>>(new Map());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabMode>("lista");
  const [playerSearch, setPlayerSearch] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const userPromise = supabase.auth.getUser();
      const scoresPromise = supabase
        .from("user_scores")
        .select(
          "user_id, total_points, group_stage_points, knockout_exact_points, qualification_points, award_points"
        )
        .order("total_points", { ascending: false });

      const profilesPromise = supabase
        .from("profiles")
        .select("id, display_name, has_paid, is_active");
      const completionPromise = supabase.rpc("get_porra_completion_status");

      const [
        {
          data: { user },
        },
        { data: scores },
        { data: profiles },
        { data: completionRows },
      ] = await Promise.all([userPromise, scoresPromise, profilesPromise, completionPromise]);

      const uid = user?.id ?? "";
      if (uid) setCurrentUserId(uid);

      const profileMap = new Map<string, ProfileRow>(
        ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
      );
      setAllProfiles(((profiles ?? []) as ProfileRow[]).filter((profile) => profile.is_active !== false));
      setCompletionByUser(
        new Map(
          ((completionRows ?? []) as CompletionStatusRow[]).map((row) => [
            row.user_id,
            getPorraCompletion({
              groupPredictionCount: row.group_prediction_count,
              groupStandingRows: row.group_standing_rows,
              knockoutPredictionCount: row.knockout_prediction_count,
              awardPredictionCount: row.award_prediction_count,
            }),
          ])
        )
      );

      const scoreEntries = ((scores ?? []) as UserScoreRow[])
        .map((s) => {
          const profile = profileMap.get(s.user_id);
          return {
            position: 0,
            user_id: s.user_id,
            name: profile?.display_name ?? "Desconocido",
            total_points: s.total_points,
            group_stage_points: s.group_stage_points,
            knockout_exact_points: s.knockout_exact_points,
            qualification_points: s.qualification_points,
            award_points: s.award_points,
            isYou: s.user_id === uid,
            has_paid: profile?.has_paid ?? false,
            is_active: profile?.is_active,
          };
        })
        .filter(isCompetitionParticipant)
        .sort((a, b) => b.total_points - a.total_points);

      const paid: LeaderboardEntry[] = assignCompetitionPositions(
        scoreEntries,
        (entry) => entry.total_points
      );

      setEntries(paid);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel("user_scores_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_scores" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive display data
  const {
    youIdx,
    you,
    rankingRows,
    top3,
    rest,
    pendingPlayers,
    statusProfiles,
    searchSuggestions,
  } = useMemo(() => {
    const entryByUserId = new Map(entries.map((entry) => [entry.user_id, entry]));
    const searchTargets: RankingSearchTarget[] = allProfiles.map((profile) => {
      const entry = entryByUserId.get(profile.id);
      return {
        id: profile.id,
        displayName: profile.display_name,
        hasPaid: profile.has_paid,
        position: entry?.position ?? null,
        totalPoints: entry?.total_points ?? 0,
        isCurrentUser: profile.id === currentUserId,
      };
    });
    const filteredIds = new Set(
      filterRankingSearchTargets(searchTargets, playerSearch).map((target) => target.id)
    );
    const displayEntries = playerSearch.trim()
      ? entries.filter((entry) => filteredIds.has(entry.user_id))
      : entries;
    const displayProfiles = playerSearch.trim()
      ? allProfiles.filter((profile) => filteredIds.has(profile.id))
      : allProfiles;
    const currentYouIdx = entries.findIndex((e) => e.isYou);
    const currentYou = currentYouIdx >= 0 ? entries[currentYouIdx] : null;
    const rows: RankingRow[] = displayEntries.map((e) => {
      const isYou = e.user_id === currentUserId;
      const gapInfo =
        isYou && currentYouIdx >= 0
          ? buildGapInfo(entries, currentYouIdx)
          : undefined;
      return {
        position: e.position,
        movement: 0,
        name: e.name,
        points: e.total_points,
        isYou,
        userId: e.user_id,
        breakdown: {
          grupos: e.group_stage_points,
          cuadro: e.knockout_exact_points,
          clasif: e.qualification_points,
          premios: e.award_points,
        },
        gapInfo,
      };
    });

    return {
      youIdx: currentYouIdx,
      you: currentYou,
      rankingRows: rows,
      top3: displayEntries.slice(0, 3).map((e) => ({
        name: e.name,
        points: e.total_points,
        movement: 0,
        isYou: e.user_id === currentUserId,
      })),
      rest: displayEntries.slice(3),
      pendingPlayers: displayProfiles
        .filter((profile) => !entries.some((entry) => entry.user_id === profile.id))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
      statusProfiles: displayProfiles
        .slice()
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
      searchSuggestions: getRankingSearchSuggestions(searchTargets, playerSearch),
    };
  }, [allProfiles, entries, currentUserId, playerSearch]);

  const youAbove =
    you && youIdx > 0
      ? entries[0].total_points - you.total_points
      : null;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="px-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">
          Clasificación
        </h1>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={playerSearch}
            onChange={(event) => {
              setPlayerSearch(event.target.value);
              if (tab !== "lista") setTab("lista");
            }}
            type="text"
            aria-label="Buscar jugador"
            placeholder="Buscar jugador..."
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue/25"
          />
          {playerSearch.trim() && (
            <button
              type="button"
              onClick={() => setPlayerSearch("")}
              aria-label="Limpiar busqueda"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-faint hover:bg-surface-sunken hover:text-ink focus:outline-none focus:ring-2 focus:ring-blue/25"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchSuggestions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => {
                  setPlayerSearch(suggestion.value);
                  setTab("lista");
                }}
                className="shrink-0 rounded-md border border-border bg-surface px-2.5 py-1 text-left text-[11px] font-semibold text-ink-muted hover:border-blue/40 hover:text-ink focus:outline-none focus:ring-2 focus:ring-blue/25"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle */}
      <div className="bg-surface-sunken rounded-lg p-1 flex">
        <button
          onClick={() => setTab("lista")}
          className={`flex-1 text-center py-2 rounded-md font-marcador uppercase text-xs tracking-wider transition-all ${
            tab === "lista"
              ? "bg-surface text-ink shadow"
              : "text-ink-muted"
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setTab("podio")}
          className={`flex-1 text-center py-2 rounded-md font-marcador uppercase text-xs tracking-wider transition-all ${
            tab === "podio"
              ? "bg-surface text-ink shadow"
              : "text-ink-muted"
          }`}
        >
          Podio
        </button>
        <button
          onClick={() => setTab("estado")}
          className={`flex-1 text-center py-2 rounded-md font-marcador uppercase text-xs tracking-wider transition-all ${
            tab === "estado"
              ? "bg-surface text-ink shadow"
              : "text-ink-muted"
          }`}
        >
          Estado
        </button>
      </div>

      {/* Empty state */}
      {loading && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-ink-muted text-sm">
          Cargando clasificacion...
        </div>
      )}
      {shouldShowEmptyState(loading, entries.length) && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-ink-muted text-sm">
          Aun no hay puntuaciones disponibles.
        </div>
      )}
      {!loading && playerSearch.trim() && rankingRows.length === 0 && pendingPlayers.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-ink-muted">
          No hay jugadores que coincidan con la busqueda.
        </div>
      )}

      {/* Lista mode */}
      {tab === "lista" && entries.length > 0 && (
        <div className="space-y-4">
          <RankingList players={rankingRows} />
          {pendingPlayers.length > 0 && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="mb-2 font-marcador text-xs uppercase tracking-wider text-ink-muted">
                Registrados sin ranking
              </p>
              <div className="space-y-1">
                {pendingPlayers.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/jugador/${profile.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-surface-sunken"
                  >
                    <span className="font-semibold text-ink">{profile.display_name}</span>
                    <span className="text-xs text-ink-muted">
                      {profile.has_paid ? "Sin puntos" : "Pendiente pago"}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Podio mode */}
      {tab === "podio" && entries.length > 0 && (
        <div className="space-y-3">
          {/* Podium */}
          <Podium players={top3} />

          {/* Tu resumen card */}
          {you && (
            <div className="bg-surface border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-marcador text-2xl font-bold text-ink">
                  {you.total_points}
                  <span className="text-sm font-sans text-ink-muted ml-1">pts</span>
                </span>
                <span className="font-marcador text-xs font-bold text-ink-muted uppercase ml-auto">
                  {you.position}º · tu resumen
                </span>
              </div>
              <BreakdownBar
                grupos={you.group_stage_points}
                cuadro={you.knockout_exact_points}
                clasif={you.qualification_points}
                premios={you.award_points}
              />
              {youAbove !== null && youAbove > 0 && (
                <p className="mt-2 text-[10px] font-semibold text-ink-muted">
                  A {youAbove} del 1º
                </p>
              )}
            </div>
          )}

          {/* Remaining players (4th+) */}
          {rest.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {rest.map((e, i) => {
                const initial = e.name.slice(0, 2);
                return (
                  <Link
                    key={e.user_id}
                    href={`/jugador/${e.user_id}`}
                    className={`grid grid-cols-[20px_28px_1fr_auto] items-center gap-2.5 px-3 py-2.5 ${
                      i > 0 ? "border-t border-border" : ""
                    } ${e.isYou ? "bg-red/5" : ""}`}
                  >
                    <span className="text-center font-marcador text-sm font-bold text-ink-faint">
                      {e.position}
                    </span>
                    <span className="font-marcador text-[11px] font-bold text-ink-faint text-center">
                      =
                    </span>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken font-marcador text-[10px] font-bold text-ink-muted flex-shrink-0">
                        {initial}
                      </span>
                      <span className="truncate font-sans text-xs font-bold text-ink">
                        {e.name}
                      </span>
                    </span>
                    <span className="font-marcador text-base font-bold text-ink">
                      {e.total_points}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inscritos mode */}
      {tab === "estado" && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {shouldShowEmptyState(loading, statusProfiles.length) ? (
            <div className="p-4 text-sm text-ink-muted">Aún no hay usuarios registrados.</div>
          ) : !loading ? (
            statusProfiles.map((profile, index) => {
              const completion = completionByUser.get(profile.id) ?? getPorraCompletion({
                groupPredictionCount: 0,
                groupStandingRows: 0,
                knockoutPredictionCount: 0,
                awardPredictionCount: 0,
              });

              return (
                <Link
                  key={profile.id}
                  href={`/jugador/${profile.id}`}
                  className={cn(
                    "block px-3 py-3 hover:bg-surface-sunken",
                    index > 0 && "border-t border-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-sans text-sm font-bold text-ink">
                      {profile.display_name}
                    </span>
                    <span className="flex-shrink-0 text-xs font-semibold text-ink-muted">
                      {profile.has_paid ? "Registrado" : "Pendiente pago"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <PhasePill label="Grupos" phase={completion.grupos} />
                    <PhasePill label="Clasificados" phase={completion.clasificados} />
                    <PhasePill label="Cuadro" phase={completion.cuadro} />
                    <PhasePill label="Premios" phase={completion.premios} />
                  </div>
                </Link>
              );
            })
          ) : null}
        </div>
      )}
    </div>
  );
}

const PHASE_LABELS: Record<PorraPhaseState, string> = {
  empty: "Sin empezar",
  partial: "Parcial",
  complete: "Completa",
};

const PHASE_CLASS: Record<PorraPhaseState, string> = {
  empty: "border-border bg-surface-sunken text-ink-muted",
  partial: "border-yellow-500/30 bg-yellow-500/10 text-yellow-800",
  complete: "border-green-600/30 bg-green-600/10 text-green-800",
};

function PhasePill({
  label,
  phase,
}: {
  label: string;
  phase: PorraCompletion[keyof PorraCompletion];
}) {
  return (
    <div className={cn("rounded-lg border px-2 py-1.5", PHASE_CLASS[phase.state])}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-marcador text-[10px] uppercase tracking-wider">
          {label}
        </span>
        <span className="font-marcador text-[10px] font-bold">{phase.label}</span>
      </div>
      <p className="mt-0.5 text-[10px] font-semibold">{PHASE_LABELS[phase.state]}</p>
    </div>
  );
}
