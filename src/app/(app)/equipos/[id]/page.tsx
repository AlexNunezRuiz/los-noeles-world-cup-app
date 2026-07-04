"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import { stageLabel } from "@/lib/tournament/labels";
import { isPredictionsLocked } from "@/lib/predictions/lock";
import {
  loadAllUserBrackets,
  type AllBracketsMatch,
} from "@/lib/results/load-all-user-brackets";
import type { BuiltUserBracket } from "@/lib/results/user-bracket";
import {
  teamFurthestReach,
  reachDisplay,
  type TeamReach,
} from "@/lib/results/team-progression";
import {
  sortProfilesByCurrentRanking,
  filterRankedPredictionProfiles,
  type ProfileForRanking,
  type ScoreForRanking,
  type RankedPredictionProfile,
} from "@/lib/results/prediction-compare";

interface TeamRow {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
}

interface PlayerRow {
  id: number;
  name: string;
  position: string | null;
  shirt_number: number | null;
  nationality: string | null;
}

interface VenueRow {
  name: string;
  city: string;
}

interface MatchRow {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  venues?: VenueRow | VenueRow[] | null;
}

const POSITION_ORDER: Record<string, number> = {
  goalkeeper: 1,
  portero: 1,
  defender: 2,
  defensa: 2,
  midfielder: 3,
  centrocampista: 3,
  forward: 4,
  delantero: 4,
};

/** Clases de la pastilla (pill) según hasta dónde llega la selección. */
function reachToneClasses(reach: TeamReach): string {
  switch (reach.kind) {
    case "champion":
      return "bg-gold/15 text-gold";
    case "runner_up":
      return "bg-ink/10 text-ink";
    case "third":
    case "fourth":
    case "semifinalist":
      return "bg-blue/12 text-blue";
    case "reached":
      return reach.stage === "final"
        ? "bg-ink/10 text-ink"
        : "bg-surface-sunken text-ink-muted";
    case "eliminated":
      return "bg-surface-sunken text-ink-muted";
    case "none":
      return "bg-surface-sunken text-ink-faint";
  }
}

interface RankedReach {
  profile: RankedPredictionProfile;
  reach: TeamReach;
}

function formatMatchDate(value: string | null) {
  if (!value) return "Fecha por confirmar";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

export default function EquipoPage() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params?.id);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [teams, setTeams] = useState<Map<number, TeamRow>>(new Map());
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [rankedProfiles, setRankedProfiles] = useState<RankedPredictionProfile[]>([]);
  const [bracketByUser, setBracketByUser] = useState<Map<string, BuiltUserBracket>>(new Map());
  const [bracketsLoaded, setBracketsLoaded] = useState(false);
  const [reachQuery, setReachQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!teamId) return;

    async function load() {
      const [
        { data: { user } },
        { data: teamData },
        { data: teamRows },
        { data: playerRows },
        { data: matchRows },
        { data: configRows },
        { data: profileRows },
        { data: scoreRows },
        { data: allMatchRows },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("teams")
          .select("id, name, code, flag_emoji, group_letter")
          .eq("id", teamId)
          .single(),
        supabase.from("teams").select("id, name, code, flag_emoji, group_letter"),
        supabase
          .from("players")
          .select("id, name, position, shirt_number, nationality")
          .eq("team_id", teamId),
        supabase
          .from("matches")
          .select(
            "id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder, match_date, home_score, away_score, is_finished, venues(name, city)"
          )
          .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
          .order("match_date", { ascending: true }),
        supabase.from("tournament_config").select("key, value"),
        supabase.from("profiles").select("id, display_name, has_paid, is_active"),
        supabase.from("user_scores").select("user_id, total_points"),
        supabase
          .from("matches")
          .select("id, match_number, stage, home_placeholder, away_placeholder")
          .order("match_number"),
      ]);

      setTeam(teamData as TeamRow | null);
      setTeams(new Map(((teamRows ?? []) as TeamRow[]).map((row) => [row.id, row])));
      setPlayers((playerRows ?? []) as PlayerRow[]);
      setMatches((matchRows ?? []) as MatchRow[]);

      const locked = isPredictionsLocked(
        (configRows ?? []) as { key: string; value: string }[]
      );
      setIsLocked(locked);
      setRankedProfiles(
        sortProfilesByCurrentRanking(
          (profileRows ?? []) as ProfileForRanking[],
          (scoreRows ?? []) as ScoreForRanking[],
          user?.id ?? null
        )
      );

      // El cuadro de cada participante solo se reconstruye tras el cierre,
      // para no revelar pronósticos ajenos antes de que se bloqueen.
      if (locked) {
        loadAllUserBrackets(
          supabase,
          (allMatchRows ?? []) as AllBracketsMatch[]
        ).then((brackets) => {
          setBracketByUser(brackets);
          setBracketsLoaded(true);
        });
      }
    }

    load();
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  const orderedPlayers = useMemo(
    () =>
      [...players].sort((a, b) => {
        const posA = POSITION_ORDER[a.position?.toLowerCase() ?? ""] ?? 9;
        const posB = POSITION_ORDER[b.position?.toLowerCase() ?? ""] ?? 9;
        return posA - posB || (a.shirt_number ?? 99) - (b.shirt_number ?? 99) || a.name.localeCompare(b.name);
      }),
    [players]
  );

  // Hasta dónde lleva cada participante (pagado) esta selección, por ranking.
  const rankedReaches = useMemo<RankedReach[]>(() => {
    if (!teamId) return [];
    return rankedProfiles
      .filter((profile) => profile.rank !== null)
      .map((profile) => {
        const bracket = bracketByUser.get(profile.id);
        const reach: TeamReach = bracket
          ? teamFurthestReach(bracket, teamId)
          : { kind: "none" };
        return { profile, reach };
      });
  }, [rankedProfiles, bracketByUser, teamId]);

  const championCount = useMemo(
    () => rankedReaches.filter((r) => r.reach.kind === "champion").length,
    [rankedReaches]
  );

  const visibleReaches = useMemo<RankedReach[]>(() => {
    if (!reachQuery.trim()) return rankedReaches;
    const matches = filterRankedPredictionProfiles(
      rankedReaches.map((r) => r.profile),
      reachQuery
    );
    const ids = new Set(matches.map((p) => p.id));
    return rankedReaches.filter((r) => ids.has(r.profile.id));
  }, [rankedReaches, reachQuery]);

  if (!team) {
    return (
      <div className="space-y-4 pt-1">
        <Link href="/equipos" className="text-xs font-semibold text-ink-muted hover:text-ink">
          ← Equipos
        </Link>
        <p className="text-sm text-ink-muted">Equipo no encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8 pt-1">
      <Link href="/equipos" className="text-xs font-semibold text-ink-muted hover:text-ink">
        ← Equipos
      </Link>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <Flag emoji={team.flag_emoji} size={36} />
          <div>
            <h1 className="font-marcador text-3xl uppercase leading-none text-ink">{team.name}</h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Grupo {team.group_letter ?? "-"} · {team.code}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-sunken px-4 py-2">
          <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
            Hasta dónde la llevan
          </p>
        </div>
        {!isLocked ? (
          <p className="px-4 py-6 text-sm text-ink-muted">
            Disponible cuando se cierren las predicciones.
          </p>
        ) : !bracketsLoaded ? (
          <p className="px-4 py-6 text-sm text-ink-muted">Cargando pronósticos…</p>
        ) : rankedReaches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">
            Todavía no hay pronósticos de participantes.
          </p>
        ) : (
          <>
            {championCount > 0 && (
              <p className="px-4 pt-3 text-[11px] font-bold uppercase tracking-wide text-gold">
                {championCount === 1
                  ? "1 la ve campeona"
                  : `${championCount} la ven campeona`}
              </p>
            )}
            <div className="px-4 pt-3">
              <input
                type="search"
                value={reachQuery}
                onChange={(e) => setReachQuery(e.target.value)}
                placeholder="Buscar participante…"
                className="w-full rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-blue/60 focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            {visibleReaches.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">
                Ningún participante coincide con “{reachQuery.trim()}”.
              </p>
            ) : (
            <div className="divide-y divide-border">
              {visibleReaches.map(({ profile, reach }) => {
                const display = reachDisplay(reach);
                return (
                  <Link
                    key={profile.id}
                    href={`/jugador/${profile.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken"
                  >
                    <span className="w-6 shrink-0 font-marcador text-xs text-ink-faint">
                      {profile.rank ? `${profile.rank}º` : ""}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm text-ink",
                        profile.isCurrentUser ? "font-bold" : "font-semibold"
                      )}
                    >
                      {profile.display_name}
                      {profile.isCurrentUser && " (tú)"}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 font-marcador text-[10px] uppercase tracking-wide",
                        reachToneClasses(reach)
                      )}
                    >
                      {display.label}
                    </span>
                  </Link>
                );
              })}
            </div>
            )}
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-sunken px-4 py-2">
          <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
            Calendario y resultados
          </p>
        </div>
        {matches.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">Sin partidos asignados todavía.</p>
        ) : (
          <div className="divide-y divide-border">
            {matches.map((match) => {
              const home = match.home_team_id ? teams.get(match.home_team_id) : null;
              const away = match.away_team_id ? teams.get(match.away_team_id) : null;
              const venue = Array.isArray(match.venues) ? match.venues[0] : match.venues;
              return (
                <div key={match.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-marcador text-[10px] uppercase tracking-widest text-ink-muted">
                      P{match.match_number} · {stageLabel(match.stage, match.group_letter)}
                    </p>
                    <p className="text-[10px] font-semibold text-ink-muted">{formatMatchDate(match.match_date)}</p>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {home && <Flag emoji={home.flag_emoji} size={18} />}
                      <span className="truncate text-sm font-semibold text-ink">
                        {home?.name ?? match.home_placeholder ?? "Por decidir"}
                      </span>
                    </div>
                    <span className="font-marcador text-base text-ink">
                      {match.is_finished ? `${match.home_score ?? "-"}-${match.away_score ?? "-"}` : "vs"}
                    </span>
                    <div className="flex min-w-0 items-center justify-end gap-2">
                      <span className="truncate text-right text-sm font-semibold text-ink">
                        {away?.name ?? match.away_placeholder ?? "Por decidir"}
                      </span>
                      {away && <Flag emoji={away.flag_emoji} size={18} />}
                    </div>
                  </div>
                  {venue && (
                    <p className="text-[10px] font-semibold text-ink-muted">
                      {venue.name} · {venue.city}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-surface-sunken px-4 py-2">
          <p className="font-marcador text-xs uppercase tracking-wider text-ink-muted">
            Plantilla oficial
          </p>
        </div>
        {orderedPlayers.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">
            Plantilla pendiente de importar desde la lista oficial FIFA.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {orderedPlayers.map((player) => (
              <div key={player.id} className="grid grid-cols-[36px_1fr] gap-3 px-4 py-2.5 sm:grid-cols-[36px_1fr_130px_120px] sm:items-center">
                <span className="font-marcador text-base font-bold text-ink-faint">
                  {player.shirt_number ?? "-"}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{player.name}</span>
                  <span className="text-xs text-ink-muted sm:hidden">
                    {player.position ?? "-"} · {player.nationality ?? team.name}
                  </span>
                </div>
                <span className="hidden text-xs text-ink-muted sm:block">{player.position ?? "-"}</span>
                <span className="hidden text-xs font-semibold text-ink-muted sm:block">
                  {player.nationality ?? team.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
