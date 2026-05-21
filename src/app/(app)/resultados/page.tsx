"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TuJornadaCard } from "@/components/results/tu-jornada-card";
import { MatchResultCard } from "@/components/results/match-result-card";

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
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
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
      const [teamsRes, matchesRes, predictionsRes, scoresRes, profilesRes] =
        await Promise.all([
          supabase.from("teams").select("id, name, flag_emoji, group_letter"),
          supabase
            .from("matches")
            .select(
              "id, match_number, group_letter, home_team_id, away_team_id, home_score, away_score, is_finished"
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
          supabase.from("profiles").select("id, has_paid"),
        ]);

      const teams: TeamRow[] = (teamsRes.data ?? []) as TeamRow[];
      const matches: MatchRow[] = (matchesRes.data ?? []) as MatchRow[];
      const predictions: PredictionRow[] = (predictionsRes.data ?? []) as PredictionRow[];
      const scores: UserScoreRow[] = (scoresRes.data ?? []) as UserScoreRow[];
      const profiles: ProfileRow[] = (profilesRes.data ?? []) as ProfileRow[];

      // Build fast lookups
      const teamMap = new Map<number, TeamRow>(teams.map((t) => [t.id, t]));
      const predMap = new Map<number, PredictionRow>(
        predictions.map((p) => [p.match_id, p])
      );
      const paidIds = new Set<string>(
        profiles.filter((p) => p.has_paid).map((p) => p.id)
      );

      // Compute leaderboard position (among paid players)
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

      setFinishedMatches(finished);
      setTotalPuntos(sumPts);
      setLoading(false);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build boletin (only matches with predictions, i.e. outcome !== null)
  const boletin = finishedMatches
    .filter((m) => m.outcome !== null)
    .map((m) => ({ tipo: m.outcome as OutcomeType, puntos: m.points }));

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
              {finishedMatches.map((m) => (
                <MatchResultCard
                  key={m.matchId}
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
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Grupos tab ── */}
      {activeTab === "grupos" && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="font-marcador text-base uppercase text-ink-muted">
            Clasificación de grupos
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            La clasificación real de los grupos aparecerá aquí cuando avance el Mundial.
          </p>
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
