"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TuJornadaCard } from "@/components/results/tu-jornada-card";
import { MatchResultCard } from "@/components/results/match-result-card";
import { UpcomingStrip } from "@/components/results/upcoming-strip";
import type { CalendarMatch } from "@/components/calendar/calendar-match-row";
import { Flag } from "@/components/ui/flag";
import { formatMatchDay, matchDayKey } from "@/lib/datetime";
import { getTeams, getVenues } from "@/lib/data/static-cache";
import { buildRealGroupStandings } from "@/lib/results/group-standings";
import type { TeamStanding } from "@/lib/tournament/standings";
import { isCompetitionParticipant } from "@/lib/users/participation";
import { attachPredictionsToCalendarMatches } from "@/lib/calendar/predictions";
import { getAutoScrollDay, sortMatchesByCalendar } from "@/lib/calendar/match-position";

// ── Data shapes ──────────────────────────────────────────────────────────────

interface TeamRow {
  id: number;
  name: string;
  flag_emoji: string;
  group_letter: string | null;
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
  venue_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

interface VenueRow {
  id: number;
  name: string;
  city: string;
}

interface PredictionRow {
  match_id: number;
  home_score: number;
  away_score: number;
}

interface UserScoreRow {
  user_id: string;
  total_points: number;
}

interface ProfileRow {
  id: string;
  has_paid: boolean;
  is_active?: boolean | null;
}

// ── Outcome helpers ──────────────────────────────────────────────────────────

type OutcomeType = "exacto" | "signo" | "fallo";

function computeOutcome(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): { tipo: OutcomeType; puntos: number } {
  if (predHome === realHome && predAway === realAway) {
    return { tipo: "exacto", puntos: 2 };
  }
  if (Math.sign(predHome - predAway) === Math.sign(realHome - realAway)) {
    return { tipo: "signo", puntos: 1 };
  }
  return { tipo: "fallo", puntos: 0 };
}

// ── Types for UI ─────────────────────────────────────────────────────────────

type TabKey = "partidos" | "grupos" | "cuadro";

interface FinishedMatchDisplay {
  matchId: number;
  matchNumber: number;
  match_number: number;
  match_date: string;
  is_finished: boolean;
  groupLetter: string | null;
  homeTeam: { name: string; flag_emoji: string };
  awayTeam: { name: string; flag_emoji: string };
  homeScore: number;
  awayScore: number;
  prediction: { home: number; away: number } | null;
  outcome: OutcomeType | null;
  points: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ResultadosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("partidos");
  const [finishedMatches, setFinishedMatches] = useState<FinishedMatchDisplay[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarMatch[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [realGroupStandings, setRealGroupStandings] = useState<Map<string, TeamStanding[]>>(new Map());
  const [totalPuntos, setTotalPuntos] = useState(0);
  const [posicion, setPosicion] = useState(1);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? "";

      // Parallel fetches
      const [teamsRes, venuesRes, matchesRes, predictionsRes, scoresRes, profilesRes] =
        await Promise.all([
          getTeams(),
          getVenues(),
          supabase
            .from("matches")
            .select(
              "id, match_number, stage, group_letter, home_team_id, away_team_id, home_placeholder, away_placeholder, match_date, venue_id, home_score, away_score, is_finished"
            )
            .order("match_number", { ascending: true }),
          uid
            ? supabase
                .from("match_predictions")
                .select("match_id, home_score, away_score")
                .eq("user_id", uid)
            : Promise.resolve({ data: [] as PredictionRow[], error: null }),
          supabase
            .from("user_scores")
            .select("user_id, total_points")
            .order("total_points", { ascending: false }),
          supabase.from("profiles").select("id, has_paid, is_active"),
        ]);

      const teams: TeamRow[] = teamsRes as TeamRow[];
      const venues: VenueRow[] = venuesRes as VenueRow[];
      const matches: MatchRow[] = (matchesRes.data ?? []) as MatchRow[];
      const predictions: PredictionRow[] = (predictionsRes.data ?? []) as PredictionRow[];
      const scores: UserScoreRow[] = (scoresRes.data ?? []) as UserScoreRow[];
      const profiles: ProfileRow[] = (profilesRes.data ?? []) as ProfileRow[];

      // Build fast lookups
      const teamMap = new Map<number, TeamRow>(teams.map((t) => [t.id, t]));
      const venueMap = new Map<number, VenueRow>(venues.map((v) => [v.id, v]));
      const predMap = new Map<number, PredictionRow>(
        predictions.map((p) => [p.match_id, p])
      );
      const paidIds = new Set<string>(
        profiles.filter(isCompetitionParticipant).map((p) => p.id)
      );

      const paidScoresSorted = scores
        .filter((s) => paidIds.has(s.user_id))
        .sort((a, b) => b.total_points - a.total_points);

      const myRankIdx = paidScoresSorted.findIndex((s) => s.user_id === uid);
      const myRank = myRankIdx >= 0 ? myRankIdx + 1 : paidScoresSorted.length + 1;
      setPosicion(myRank);

      // Build finished match displays
      const finished: FinishedMatchDisplay[] = [];
      let sumPts = 0;

      for (const m of matches) {
        if (!m.is_finished) continue;
        if (m.home_score === null || m.away_score === null) continue;
        if (m.home_team_id === null || m.away_team_id === null) continue;
        if (!m.match_date) continue;

        const homeTeam = teamMap.get(m.home_team_id);
        const awayTeam = teamMap.get(m.away_team_id);
        if (!homeTeam || !awayTeam) continue;

        const pred = predMap.get(m.id) ?? null;
        let outcome: OutcomeType | null = null;
        let pts = 0;

        if (pred) {
          const result = computeOutcome(
            pred.home_score,
            pred.away_score,
            m.home_score,
            m.away_score
          );
          outcome = result.tipo;
          pts = result.puntos;
          sumPts += pts;
        }

        finished.push({
          matchId: m.id,
          matchNumber: m.match_number,
          match_number: m.match_number,
          match_date: m.match_date,
          is_finished: true,
          groupLetter: m.group_letter,
          homeTeam: { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji },
          awayTeam: { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji },
          homeScore: m.home_score,
          awayScore: m.away_score,
          prediction: pred
            ? { home: pred.home_score, away: pred.away_score }
            : null,
          outcome,
          points: pts,
        });
      }

      // Build calendar matches for the "próximos partidos" strip
      const calendarMatches: CalendarMatch[] = matches
        .filter((m) => m.match_date)
        .map((m) => {
          const home = m.home_team_id ? teamMap.get(m.home_team_id) : undefined;
          const away = m.away_team_id ? teamMap.get(m.away_team_id) : undefined;
          const venue = m.venue_id ? venueMap.get(m.venue_id) : undefined;
          return {
            id: m.id,
            match_number: m.match_number,
            stage: m.stage,
            group_letter: m.group_letter,
            match_date: m.match_date as string,
            is_finished: m.is_finished,
            home_score: m.home_score,
            away_score: m.away_score,
            home: home
              ? { name: home.name, flag_emoji: home.flag_emoji }
              : null,
            away: away
              ? { name: away.name, flag_emoji: away.flag_emoji }
              : null,
            home_placeholder: m.home_placeholder,
            away_placeholder: m.away_placeholder,
            venue: venue ? { name: venue.name, city: venue.city } : null,
          };
        });

      setUpcoming(attachPredictionsToCalendarMatches(calendarMatches, predictions));
      setFinishedMatches(sortMatchesByCalendar(finished));
      setTeams(teams);
      setRealGroupStandings(buildRealGroupStandings(teams, matches));
      setTotalPuntos(sumPts);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build boletin (only matches with predictions, i.e. outcome !== null)
  const boletin = useMemo(
    () =>
      finishedMatches
        .filter((m) => m.outcome !== null)
        .map((m) => ({
          tipo: m.outcome as OutcomeType,
          puntos: m.points,
          matchId: m.matchId,
          matchNumber: m.matchNumber,
        })),
    [finishedMatches]
  );
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const groupsWithPlayedMatches = useMemo(
    () =>
      Array.from(realGroupStandings.entries()).filter(([, standings]) =>
        standings.some((standing) => standing.played > 0)
      ),
    [realGroupStandings]
  );

  useEffect(() => {
    if (loading || finishedMatches.length === 0) return;
    const targetDay = getAutoScrollDay(finishedMatches);
    if (!targetDay) return;

    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-day="${targetDay}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [finishedMatches, loading]);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "partidos", label: "Partidos" },
    { key: "grupos", label: "Grupos" },
    { key: "cuadro", label: "Cuadro" },
  ];

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div className="px-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-tight">
          Resultados
        </h1>
        <a
          href="/resultados/predicciones"
          className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-blue"
        >
          Ver predicciones de todos ›
        </a>
      </div>

      {/* TuJornadaCard */}
      {!loading && (
        <TuJornadaCard
          jornada={1}
          puntos={totalPuntos}
          posicion={posicion}
          movimiento={0}
          boletin={boletin}
        />
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-ink-muted animate-pulse">
          Cargando resultados…
        </div>
      )}

      {/* Próximos partidos */}
      {!loading && (
        <div className="sticky top-14 z-20 -mx-1 bg-cream/95 px-1 py-1 backdrop-blur">
          <UpcomingStrip matches={upcoming} />
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-lg py-2 text-center font-marcador text-[11px] uppercase tracking-wider transition-all ${
              activeTab === t.key
                ? "bg-red text-white"
                : "border border-border bg-surface text-ink-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Partidos tab ── */}
      {activeTab === "partidos" && (
        <div className="space-y-2">
          {!loading && finishedMatches.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-muted">
              No hay partidos jugados todavía.
            </div>
          )}

          {finishedMatches.length > 0 && (
            <>
              <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-ink-faint px-0.5">
                Jugados
              </p>
              {finishedMatches.map((m, index) => {
                const day = matchDayKey(m.match_date);
                const previous = finishedMatches[index - 1];
                const showDay = !previous || matchDayKey(previous.match_date) !== day;

                return (
                  <section key={m.matchId} data-day={day} className="scroll-mt-48 space-y-2">
                    {showDay && (
                      <p className="px-0.5 font-marcador text-xs font-bold uppercase tracking-wide text-ink-muted">
                        {formatMatchDay(m.match_date)}
                      </p>
                    )}
                    <MatchResultCard
                  matchId={m.matchId}
                  label={
                    m.groupLetter
                      ? `Grupo ${m.groupLetter} · Finalizado`
                      : `Partido ${m.matchNumber} · Finalizado`
                  }
                  homeTeam={m.homeTeam}
                  awayTeam={m.awayTeam}
                  homeScore={m.homeScore}
                  awayScore={m.awayScore}
                  prediction={m.prediction}
                  outcome={m.outcome}
                  points={m.points}
                    />
                  </section>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── Grupos tab ── */}
      {activeTab === "grupos" && (
        <div className="space-y-3">
          {groupsWithPlayedMatches.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="font-marcador text-base uppercase text-ink-muted">
                Clasificacion de grupos
              </p>
              <p className="mt-1 text-xs text-ink-faint">
                La clasificacion real de los grupos aparecera aqui cuando haya partidos finalizados.
              </p>
            </div>
          )}

          {groupsWithPlayedMatches.map(([groupLetter, standings]) => (
            <div key={groupLetter} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="font-marcador text-sm uppercase tracking-widest text-ink-muted">
                  Grupo {groupLetter}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                  PJ Pts DG
                </p>
              </div>
              <div className="divide-y divide-border">
                {standings.map((standing) => {
                  const team = teamMap.get(standing.team_id);
                  return (
                    <div
                      key={standing.team_id}
                      className="grid grid-cols-[28px_1fr_28px_32px_32px] items-center gap-2 px-3 py-2"
                    >
                      <span className="text-center font-marcador text-sm font-bold text-ink-muted">
                        {standing.position}
                      </span>
                      <div className="flex min-w-0 items-center gap-2">
                        {team && <Flag emoji={team.flag_emoji} size={18} />}
                        <span className="truncate text-sm font-semibold text-ink">
                          {team?.name ?? "Equipo"}
                        </span>
                      </div>
                      <span className="text-right font-marcador text-sm text-ink">
                        {standing.played}
                      </span>
                      <span className="text-right font-marcador text-sm font-bold text-ink">
                        {standing.points}
                      </span>
                      <span className="text-right font-marcador text-sm text-ink-muted">
                        {standing.goal_difference > 0 ? "+" : ""}
                        {standing.goal_difference}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cuadro tab ── */}
      {activeTab === "cuadro" && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-marcador text-base uppercase text-ink-muted">
            Cuadro eliminatorio
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            El cuadro real se irá dibujando con los resultados.
          </p>
        </div>
      )}
    </div>
  );
}
