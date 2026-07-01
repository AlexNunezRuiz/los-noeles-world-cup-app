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
import { sortMatchesByCalendar } from "@/lib/calendar/match-position";
import { buildUserBracket } from "@/lib/results/user-bracket";
import { compareRealMatchToUser, type PairingComparison } from "@/lib/results/knockout-comparison";
import { getBestThirds } from "@/lib/tournament/standings";
import { stageLabel } from "@/lib/tournament/labels";
import { KnockoutBracketResults, type KnockoutResultRow } from "@/components/results/knockout-bracket-results";
import { PronosticoCruce } from "@/components/results/pronostico-cruce";
import { FlapTile } from "@/components/ui/flap-tile";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

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
  stage: string;
  groupLetter: string | null;
  isKnockout: boolean;
  comparison: PairingComparison | null;
  homeTeamIdReal: number | null;
  awayTeamIdReal: number | null;
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
  const [knockoutRows, setKnockoutRows] = useState<KnockoutResultRow[]>([]);
  const [knockoutBracket, setKnockoutBracket] = useState<{
    byMatchNumber: Map<number, PredictedKnockoutMatch>;
    stageByMatchNumber: Map<number, string>;
  }>({ byMatchNumber: new Map(), stageByMatchNumber: new Map() });
  const [pronosticoTeams, setPronosticoTeams] = useState<
    Map<number, { name: string; flag_emoji: string }>
  >(new Map());
  const [bestThirdIds, setBestThirdIds] = useState<Set<number>>(new Set());
  const [totalPuntos, setTotalPuntos] = useState(0);
  const [posicion, setPosicion] = useState(1);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // Current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? "";
      setUserId(uid);

      // Parallel fetches
      const [teamsRes, venuesRes, matchesRes, predictionsRes, scoresRes, profilesRes, predStandingsRes, bestThirdRes, positionsRes] =
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
                .select("match_id, home_score, away_score, penalty_winner")
                .eq("user_id", uid)
            : Promise.resolve({ data: [] as PredictionRow[], error: null }),
          supabase
            .from("user_scores")
            .select("user_id, total_points")
            .order("total_points", { ascending: false }),
          supabase.from("profiles").select("id, has_paid, is_active"),
          uid
            ? supabase.from("predicted_group_standings").select("group_letter, team_id, position, points, goals_for, goals_against, goal_difference").eq("user_id", uid)
            : Promise.resolve({ data: [], error: null }),
          uid
            ? supabase.from("predicted_best_third_order").select("team_id, rank").eq("user_id", uid)
            : Promise.resolve({ data: [], error: null }),
          supabase.from("knockout_bracket_positions").select("*"),
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

      // Authoritative total from real scoring (group + cuadro by pairing + clasificación + premios)
      const myTotalPoints = scores.find((s) => s.user_id === uid)?.total_points ?? 0;

      // ── User's predicted knockout bracket (for pairing comparison) ──
      const predStandings = (predStandingsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["predictedStandings"];
      const bestThirdOrder = (bestThirdRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bestThirdOrder"];
      const bracketPositions = (positionsRes.data ?? []) as Parameters<typeof buildUserBracket>[0]["bracketPositions"];

      const knockoutBase = matches
        .filter((m) => m.stage !== "group")
        .map((m) => ({ match_number: m.match_number, stage: m.stage, home_placeholder: m.home_placeholder, away_placeholder: m.away_placeholder }));

      const predForBracket = predictions.map((p) => {
        const match = matches.find((m) => m.id === p.match_id);
        return {
          match_number: match?.match_number ?? -1,
          home_score: p.home_score,
          away_score: p.away_score,
          penalty_winner: (p as PredictionRow & { penalty_winner?: "home" | "away" | null }).penalty_winner ?? null,
        };
      }).filter((p) => p.match_number > 0);

      const { byMatchNumber, stageByMatchNumber } = buildUserBracket({
        baseMatches: knockoutBase,
        predictedStandings: predStandings,
        bestThirdOrder,
        predictions: predForBracket,
        bracketPositions,
      });
      setKnockoutBracket({ byMatchNumber, stageByMatchNumber });
      setPronosticoTeams(
        new Map(teams.map((t) => [t.id, { name: t.name, flag_emoji: t.flag_emoji }]))
      );

      // Build finished match displays
      const finished: FinishedMatchDisplay[] = [];

      for (const m of matches) {
        if (!m.is_finished) continue;
        if (m.home_score === null || m.away_score === null) continue;
        if (m.home_team_id === null || m.away_team_id === null) continue;
        if (!m.match_date) continue;

        const homeTeam = teamMap.get(m.home_team_id);
        const awayTeam = teamMap.get(m.away_team_id);
        if (!homeTeam || !awayTeam) continue;

        const isKnockout = m.stage !== "group";
        const pred = predMap.get(m.id) ?? null;
        let outcome: OutcomeType | null = null;
        let pts = 0;
        let comparison: PairingComparison | null = null;
        let predictionDisplay: { home: number; away: number } | null = null;

        if (isKnockout) {
          // Cuadro: se compara por par de equipos en la misma ronda, no por slot.
          comparison = compareRealMatchToUser({
            userBracket: byMatchNumber,
            stageByMatchNumber,
            stage: m.stage,
            realHomeTeamId: m.home_team_id,
            realAwayTeamId: m.away_team_id,
            realHomeScore: m.home_score,
            realAwayScore: m.away_score,
            realPenaltyWinnerTeamId: null,
          });
        } else if (pred) {
          const result = computeOutcome(
            pred.home_score,
            pred.away_score,
            m.home_score,
            m.away_score
          );
          outcome = result.tipo;
          pts = result.puntos;
          predictionDisplay = { home: pred.home_score, away: pred.away_score };
        }

        finished.push({
          matchId: m.id,
          matchNumber: m.match_number,
          match_number: m.match_number,
          match_date: m.match_date,
          is_finished: true,
          stage: m.stage,
          groupLetter: m.group_letter,
          isKnockout,
          comparison,
          homeTeamIdReal: m.home_team_id,
          awayTeamIdReal: m.away_team_id,
          homeTeam: { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji },
          awayTeam: { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji },
          homeScore: m.home_score,
          awayScore: m.away_score,
          prediction: predictionDisplay,
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
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id,
            home_placeholder: m.home_placeholder,
            away_placeholder: m.away_placeholder,
            venue: venue ? { name: venue.name, city: venue.city } : null,
          };
        });

      // ── Knockout bracket rows (Cuadro tab): real vs user prediction ──
      const rows: KnockoutResultRow[] = matches
        .filter((m) => m.stage !== "group")
        .sort((a, b) => a.match_number - b.match_number)
        .map((m) => {
          const home = m.home_team_id ? teamMap.get(m.home_team_id) : undefined;
          const away = m.away_team_id ? teamMap.get(m.away_team_id) : undefined;
          let comparison = null;
          if (m.home_team_id && m.away_team_id && m.home_score !== null && m.away_score !== null) {
            comparison = compareRealMatchToUser({
              userBracket: byMatchNumber,
              stageByMatchNumber,
              stage: m.stage,
              realHomeTeamId: m.home_team_id,
              realAwayTeamId: m.away_team_id,
              realHomeScore: m.home_score,
              realAwayScore: m.away_score,
              realPenaltyWinnerTeamId: null,
            });
          }
          return {
            matchNumber: m.match_number,
            stage: m.stage,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            home: home ? { name: home.name, flag_emoji: home.flag_emoji } : null,
            away: away ? { name: away.name, flag_emoji: away.flag_emoji } : null,
            homeScore: m.home_score,
            awayScore: m.away_score,
            comparison,
          };
        });
      setKnockoutRows(rows);

      const thirds = getBestThirds(buildRealGroupStandings(teams, matches));
      setBestThirdIds(new Set(thirds.map((t) => t.team_id)));

      setUpcoming(attachPredictionsToCalendarMatches(calendarMatches, predictions));
      setFinishedMatches(sortMatchesByCalendar(finished));
      setTeams(teams);
      setRealGroupStandings(buildRealGroupStandings(teams, matches));
      setTotalPuntos(myTotalPoints);
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

  // Más nuevos arriba, más antiguos abajo (sin scroll automático).
  const displayedMatches = useMemo(
    () => [...finishedMatches].reverse(),
    [finishedMatches]
  );

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
        {userId && (
          <a
            href={`/jugador/${userId}`}
            className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-blue"
          >
            Ver mis puntos desglosados ›
          </a>
        )}
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
          <UpcomingStrip
            matches={upcoming}
            bracket={knockoutBracket.byMatchNumber}
            stageByMatchNumber={knockoutBracket.stageByMatchNumber}
            teams={pronosticoTeams}
          />
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
              {displayedMatches.map((m, index) => {
                const day = matchDayKey(m.match_date);
                const previous = displayedMatches[index - 1];
                const showDay = !previous || matchDayKey(previous.match_date) !== day;

                return (
                  <section key={m.matchId} data-day={day} className="scroll-mt-48 space-y-2">
                    {showDay && (
                      <p className="px-0.5 font-marcador text-xs font-bold uppercase tracking-wide text-ink-muted">
                        {formatMatchDay(m.match_date)}
                      </p>
                    )}
                    {m.isKnockout ? (
                      <div className="rounded-xl border border-border bg-surface p-3">
                        <p className="font-sans text-[8px] font-bold uppercase tracking-widest text-ink-faint">
                          {stageLabel(m.stage, null)} · Finalizado
                        </p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Flag emoji={m.homeTeam.flag_emoji} size={22} />
                            <span className="truncate text-sm font-bold text-ink">{m.homeTeam.name}</span>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <FlapTile value={m.homeScore} size="sm" />
                            <FlapTile value={m.awayScore} size="sm" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
                            <Flag emoji={m.awayTeam.flag_emoji} size={22} />
                            <span className="truncate text-right text-sm font-bold text-ink">{m.awayTeam.name}</span>
                          </div>
                        </div>
                        <div className="mt-2 border-t border-dashed border-border pt-2">
                          {m.homeTeamIdReal != null && m.awayTeamIdReal != null ? (
                            <PronosticoCruce
                              matchNumber={m.match_number}
                              stage={m.stage}
                              realHomeTeamId={m.homeTeamIdReal}
                              realAwayTeamId={m.awayTeamIdReal}
                              bracket={knockoutBracket.byMatchNumber}
                              stageByMatchNumber={knockoutBracket.stageByMatchNumber}
                              teams={pronosticoTeams}
                              comparison={m.comparison}
                            />
                          ) : null}
                        </div>
                      </div>
                    ) : (
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
                    )}
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
                        {standing.position === 1 && (
                          <span className="shrink-0 rounded bg-green/15 px-1 text-[9px] font-bold uppercase text-green">1º</span>
                        )}
                        {(standing.position === 1 || standing.position === 2) && (
                          <span className="shrink-0 rounded bg-blue/15 px-1 text-[9px] font-bold uppercase text-blue">Clasificado</span>
                        )}
                        {standing.position === 3 && bestThirdIds.has(standing.team_id) && (
                          <span className="shrink-0 rounded bg-amber-500/15 px-1 text-[9px] font-bold uppercase text-amber-600">Mejor 3º</span>
                        )}
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
        <KnockoutBracketResults
          rows={knockoutRows}
          bracket={knockoutBracket.byMatchNumber}
          stageByMatchNumber={knockoutBracket.stageByMatchNumber}
          teams={pronosticoTeams}
        />
      )}
    </div>
  );
}
