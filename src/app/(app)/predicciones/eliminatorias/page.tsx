"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import { StageBar } from "@/components/porra/stage-bar";
import { TieCard } from "@/components/predictions/tie-card";
import { ScorePad } from "@/components/predictions/score-pad";
import { ClassicBracket, type BracketMatchView } from "@/components/predictions/classic-bracket";
import { MatchResultDialog } from "@/components/predictions/match-result-dialog";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import { getTeams, getBracketPositions } from "@/lib/data/static-cache";
import { usePredictionLockRealtime } from "@/lib/predictions/use-lock-realtime";
import { getKnockoutEditingViewState } from "@/lib/predictions/knockout-editing";
import { canEditPredictions } from "@/lib/predictions/lock";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

interface BracketPosition {
  match_number: number;
  slot: "home" | "away";
  source_type: string;
  source_group?: string;
  source_match_number?: number;
  best_third_pool?: string;
}

/** Page-local prediction: a side is `null` until the user types its value. */
interface KoPrediction {
  match_id: number;
  match_number: number;
  home_score: number | null;
  away_score: number | null;
  penalty_winner?: "home" | "away" | null;
}

interface BestThirdOverride {
  team_id: number;
  rank: number;
}

interface ConfigRow {
  key: string;
  value: string;
}

/** A prediction only counts once BOTH scores have been entered. */
function isKoComplete(p: KoPrediction | undefined): boolean {
  return p !== undefined && p.home_score !== null && p.away_score !== null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const ROUND_TABS = [
  { key: "round_of_32",   label: "Dieciseisavos",  stages: ["round_of_32"] },
  { key: "round_of_16",   label: "Octavos", stages: ["round_of_16"] },
  { key: "quarter_final", label: "Cuartos", stages: ["quarter_final"] },
  { key: "semi_final",    label: "Semis",   stages: ["semi_final"] },
  { key: "final",         label: "Final",   stages: ["third_place", "final"] },
] as const;

type RoundKey = (typeof ROUND_TABS)[number]["key"];

const ROUND_LABELS: Record<string, string> = {
  round_of_32:   "Dieciseisavos",
  round_of_16:   "Octavos",
  quarter_final: "Cuartos",
  semi_final:    "Semis",
  third_place:   "3er/4to",
  final:         "Final",
};

// ─── Helper: build sourceLabel from bracket position data ─────────────────────

function buildSourceLabel(
  bp: BracketPosition | undefined,
  placeholder: string | undefined | null
): string {
  if (bp) {
    if (bp.source_type === "group_winner" && bp.source_group) {
      return `1º Gr.${bp.source_group}`;
    }
    if (bp.source_type === "group_runner_up" && bp.source_group) {
      return `2º Gr.${bp.source_group}`;
    }
    if (bp.source_type === "best_third" && bp.best_third_pool) {
      return `3º (${bp.best_third_pool})`;
    }
    if (bp.source_type === "match_winner" && bp.source_match_number) {
      return `W P${bp.source_match_number}`;
    }
    if (bp.source_type === "match_loser" && bp.source_match_number) {
      return `L P${bp.source_match_number}`;
    }
  }
  return placeholder ?? "TBD";
}

function getSourceGroups(bp: BracketPosition | undefined): string[] {
  if (!bp) return [];
  if ((bp.source_type === "group_winner" || bp.source_type === "group_runner_up") && bp.source_group) {
    return [bp.source_group];
  }
  if (bp.source_type === "best_third" && bp.best_third_pool) {
    return bp.best_third_pool.split(",").map((group) => group.trim()).filter(Boolean);
  }
  return [];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EliminatoriasPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [baseKnockoutMatches, setBaseKnockoutMatches] = useState<BracketMatch[]>([]);
  const [groupStandings, setGroupStandings] = useState<Map<string, TeamStanding[]>>(new Map());
  const [bestThirds, setBestThirds] = useState<TeamStanding[]>([]);
  const [predictions, setPredictions] = useState<Map<number, KoPrediction>>(new Map());
  const [bracketPositions, setBracketPositions] = useState<BracketPosition[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [matchIdMap, setMatchIdMap] = useState<Map<number, number>>(new Map());
  const [activeRound, setActiveRound] = useState<RoundKey>("round_of_32");
  const [editing, setEditing] = useState<{ matchNum: number; side: "home" | "away" } | null>(null);
  const [awaitingWinnerMatch, setAwaitingWinnerMatch] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"rondas" | "cuadro">("rondas");
  const [cuadroSelectedMatch, setCuadroSelectedMatch] = useState<number | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const supabase = createClient();
  const { setLockConfigRows } = usePredictionLockRealtime(supabase, setIsLocked);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [
        teamsRes,
        matchesRes,
        standingsRes,
        bracketPosRes,
        predsRes,
        configRes,
        bestThirdOrderRes,
      ] = await Promise.all([
        getTeams(),
        supabase.from("matches").select("*").neq("stage", "group").order("match_number"),
        supabase.from("predicted_group_standings").select("*").eq("user_id", user.id),
        getBracketPositions(),
        supabase.from("match_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_config").select("key, value"),
        supabase
          .from("predicted_best_third_order")
          .select("team_id, rank")
          .eq("user_id", user.id)
          .order("rank"),
      ]);

      setTeams(teamsRes);
      setLockConfigRows((configRes.data ?? []) as ConfigRow[]);

      // Build match_number -> id map
      const idMap = new Map<number, number>();
      const matchNumberById = new Map<number, number>();
      for (const m of matchesRes.data || []) {
        idMap.set(m.match_number, m.id);
        matchNumberById.set(m.id, m.match_number);
      }
      setMatchIdMap(idMap);

      // Build group standings
      const standingsByGroup = new Map<string, Array<{
        team_id: number;
        position: number;
        points: number;
        goals_for: number;
        goals_against: number;
        goal_difference: number;
      }>>();
      for (const row of standingsRes.data || []) {
        const group = row.group_letter as string;
        const rows = standingsByGroup.get(group) ?? [];
        rows.push(row);
        standingsByGroup.set(group, rows);
      }

      const groupStandings = new Map<string, TeamStanding[]>();
      for (const group of GROUPS) {
        const gs = (standingsByGroup.get(group) ?? [])
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          .map((s: {
            team_id: number;
            position: number;
            points: number;
            goals_for: number;
            goals_against: number;
            goal_difference: number;
          }) => ({
            team_id: s.team_id,
            position: s.position,
            points: s.points,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goals_for: s.goals_for,
            goals_against: s.goals_against,
            goal_difference: s.goal_difference,
          }));
        if (gs.length > 0) groupStandings.set(group, gs);
      }

      const bestThirdOrder = new Map(
        ((bestThirdOrderRes.data || []) as BestThirdOverride[]).map((row) => [
          row.team_id,
          row.rank,
        ])
      );
      const bestThirds = getBestThirds(groupStandings, bestThirdOrder);
      setGroupStandings(groupStandings);
      setBestThirds(bestThirds);

      // Build predictions map (match_number based)
      const predMap = new Map<number, KnockoutPrediction>();
      for (const p of predsRes.data || []) {
        const matchNum = matchNumberById.get(p.match_id);
        if (matchNum) {
          predMap.set(matchNum, {
            match_id: p.match_id,
            match_number: matchNum,
            home_score: p.home_score,
            away_score: p.away_score,
            penalty_winner: p.penalty_winner,
          });
        }
      }
      // Loaded predictions come from the DB with both scores set.
      setPredictions(predMap as Map<number, KoPrediction>);

      // Build knockout matches
      const knockoutMatches: BracketMatch[] = (matchesRes.data || []).map((m: {
        match_number: number;
        stage: string;
        home_team_id?: number;
        away_team_id?: number;
        home_placeholder?: string;
        away_placeholder?: string;
      }) => ({
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      }));
      setBaseKnockoutMatches(knockoutMatches);

      const bpList: BracketPosition[] = bracketPosRes.map((bp: {
        match_number: number;
        slot: string;
        source_type: string;
        source_group?: string;
        source_match_number?: number;
        best_third_pool?: string;
      }) => ({
        match_number: bp.match_number,
        slot: bp.slot as "home" | "away",
        source_type: bp.source_type,
        source_group: bp.source_group,
        source_match_number: bp.source_match_number,
        best_third_pool: bp.best_third_pool,
      }));

      setBracketPositions(bpList);

      const populated = populateKnockoutBracket(
        groupStandings,
        bestThirds,
        knockoutMatches,
        predMap,
        bpList
      );

      setBracketMatches(populated);
    }
    load();
  }, []);

  // ── Re-populate bracket when predictions change ────────────────────────────

  useEffect(() => {
    if (baseKnockoutMatches.length === 0 || bracketPositions.length === 0) return;
    const completePredictions = new Map<number, KnockoutPrediction>();
    for (const [matchNumber, pred] of Array.from(predictions.entries())) {
      if (pred.home_score === null || pred.away_score === null) continue;
      completePredictions.set(matchNumber, {
        match_id: pred.match_id,
        match_number: matchNumber,
        home_score: pred.home_score,
        away_score: pred.away_score,
        penalty_winner: pred.penalty_winner ?? undefined,
      });
    }
    setBracketMatches(populateKnockoutBracket(groupStandings, bestThirds, baseKnockoutMatches, completePredictions, bracketPositions));
  }, [baseKnockoutMatches, bestThirds, bracketPositions, groupStandings, predictions]);

  // ── Prediction save ────────────────────────────────────────────────────────

  const savePrediction = useCallback(
    async (matchNumber: number, homeScore: number, awayScore: number) => {
      const matchId = matchIdMap.get(matchNumber);
      if (!userId || !matchId || isLocked) return;
      setSaving(true);
      const pred = predictions.get(matchNumber);
      const penaltyWinner = homeScore === awayScore ? pred?.penalty_winner ?? null : null;
      await supabase.from("match_predictions").upsert(
        {
          user_id: userId,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          penalty_winner: penaltyWinner,
        },
        { onConflict: "user_id,match_id" }
      );
      setSaving(false);
    },
    [matchIdMap, userId, isLocked, predictions, supabase]
  );

  const savePredictionFull = useCallback(
    async (
      matchNumber: number,
      homeScore: number,
      awayScore: number,
      penaltyWinner?: "home" | "away"
    ) => {
      const matchId = matchIdMap.get(matchNumber);
      if (!userId || !matchId || isLocked) return;
      await supabase.from("match_predictions").upsert(
        {
          user_id: userId,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          penalty_winner: homeScore === awayScore ? penaltyWinner ?? null : null,
        },
        { onConflict: "user_id,match_id" }
      );
    },
    [matchIdMap, userId, isLocked, supabase]
  );

  const handlePenaltyWinner = useCallback(
    (matchNumber: number, winner: "home" | "away") => {
      if (!canEditPredictions(isLocked)) return;
      const pred = predictions.get(matchNumber);
      setPredictions((prev) => {
        const next = new Map(prev);
        const existing = prev.get(matchNumber);
        if (existing) {
          next.set(matchNumber, { ...existing, penalty_winner: winner });
        }
        return next;
      });
      if (pred && pred.home_score !== null && pred.away_score !== null) {
        savePredictionFull(matchNumber, pred.home_score, pred.away_score, winner);
      }
      setAwaitingWinnerMatch(null);
      setEditing(null);
    },
    [isLocked, predictions, savePredictionFull]
  );

  // ── ScorePad / TileTap ────────────────────────────────────────────────────

  const activeRoundMatches = useMemo(() => {
    const tab = ROUND_TABS.find((t) => t.key === activeRound);
    if (!tab) return [];
    const stages = new Set<string>(tab.stages);
    return bracketMatches
      .filter((m) => stages.has(m.stage))
      .sort((a, b) => a.match_number - b.match_number);
  }, [activeRound, bracketMatches]);

  const handleTileTap = useCallback(
    (matchNum: number, side: "home" | "away") => {
      if (!canEditPredictions(isLocked)) return;
      setEditing({ matchNum, side });
    },
    [isLocked]
  );

  const handleDigit = useCallback(
    (n: number) => {
      if (!canEditPredictions(isLocked)) return;
      if (!editing) return;
      const { matchNum, side } = editing;
      const pred = predictions.get(matchNum);
      const newHome = side === "home" ? n : pred?.home_score ?? null;
      const newAway = side === "away" ? n : pred?.away_score ?? null;
      const isCompleteDraw = newHome !== null && newAway !== null && newHome === newAway;

      setPredictions((prev) => {
        const next = new Map(prev);
        const existing = prev.get(matchNum);
        next.set(matchNum, {
          match_id: matchIdMap.get(matchNum) || 0,
          match_number: matchNum,
          home_score: newHome,
          away_score: newAway,
          penalty_winner: isCompleteDraw ? existing?.penalty_winner : null,
        });
        return next;
      });
      setAwaitingWinnerMatch(isCompleteDraw ? matchNum : null);

      // Persist only once both sides have a value.
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (newHome !== null && newAway !== null) {
        saveTimeout.current = setTimeout(() => savePrediction(matchNum, newHome, newAway), 800);
      }

      // Auto-advance, except knockout draws need a manual winner decision.
      if (side === "home") {
        setEditing({ matchNum, side: "away" });
      } else {
        if (isCompleteDraw) {
          setEditing(null);
          return;
        }
        const currentIdx = activeRoundMatches.findIndex((m) => m.match_number === matchNum);
        const nextMatch =
          currentIdx >= 0 && currentIdx < activeRoundMatches.length - 1
            ? activeRoundMatches[currentIdx + 1]
            : null;
        if (nextMatch) {
          setEditing({ matchNum: nextMatch.match_number, side: "home" });
        } else {
          setEditing(null);
        }
      }
    },
    [activeRoundMatches, editing, isLocked, matchIdMap, predictions, savePrediction]
  );

  // ── Derived data ──────────────────────────────────────────────────────────

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const completedCount = useMemo(
    () =>
      Array.from(predictions.values()).filter(
        (pred) =>
          isKoComplete(pred) &&
          (pred.home_score !== pred.away_score ||
            pred.penalty_winner === "home" ||
            pred.penalty_winner === "away")
      ).length,
    [predictions]
  );
  const elimPct = Math.round((completedCount / 32) * 100);

  // Build a lookup: match_number + slot -> BracketPosition
  const bpMap = useMemo(() => {
    const map = new Map<string, BracketPosition>();
    for (const bp of bracketPositions) {
      map.set(`${bp.match_number}:${bp.slot}`, bp);
    }
    return map;
  }, [bracketPositions]);

  // ── Editing team for ScorePad ─────────────────────────────────────────────

  const editingMatch = editing
    ? bracketMatches.find((m) => m.match_number === editing.matchNum)
    : null;
  const editingTeamId = editingMatch
    ? editing?.side === "home"
      ? editingMatch.home_team_id
      : editingMatch.away_team_id
    : null;
  const editingTeam = editingTeamId ? teamsMap.get(editingTeamId) : null;

  // ── Classic bracket derived data ─────────────────────────────────────────

  const bracketMatchViews: BracketMatchView[] = useMemo(
    () =>
      bracketMatches.map((m) => {
        const homeBp = bpMap.get(`${m.match_number}:home`);
        const awayBp = bpMap.get(`${m.match_number}:away`);
        const homeTeam = m.home_team_id ? teamsMap.get(m.home_team_id) : undefined;
        const awayTeam = m.away_team_id ? teamsMap.get(m.away_team_id) : undefined;
        return {
          match_number: m.match_number,
          stage: m.stage,
          homeTeam: homeTeam ? { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji } : null,
          awayTeam: awayTeam ? { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji } : null,
          homeSourceLabel: buildSourceLabel(homeBp, m.home_placeholder),
          awaySourceLabel: buildSourceLabel(awayBp, m.away_placeholder),
        };
      }),
    [bracketMatches, bpMap, teamsMap]
  );

  const cuadroSelectedMatchData = cuadroSelectedMatch !== null
    ? bracketMatchViews.find((m) => m.match_number === cuadroSelectedMatch) ?? null
    : null;

  const cuadroSelectedPred = cuadroSelectedMatch !== null
    ? predictions.get(cuadroSelectedMatch)
    : undefined;

  const handleCuadroSave = async (
    matchNumber: number,
    home: number,
    away: number,
    penaltyWinner?: "home" | "away"
  ) => {
    if (!canEditPredictions(isLocked)) return;
    // Update local state first
    setPredictions((prev) => {
      const next = new Map(prev);
      const existing = prev.get(matchNumber);
      next.set(matchNumber, {
        match_id: matchIdMap.get(matchNumber) ?? 0,
        match_number: matchNumber,
        home_score: home,
        away_score: away,
        penalty_winner: home === away ? penaltyWinner ?? existing?.penalty_winner : null,
      });
      return next;
    });
    await savePredictionFull(matchNumber, home, away, penaltyWinner);
  };

  // ── Empty state ───────────────────────────────────────────────────────────

  if (bracketMatches.length === 0) {
    return (
      <div className={editing !== null ? "pb-44" : "pb-8"}>
        <StageBar progress={{ eliminatorias: 0 }} />
        <div className="px-4 pt-6">
          <h1 className="font-marcador text-3xl uppercase text-ink leading-none">Cuadro</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Primero completa la fase de grupos y guarda las clasificaciones.
          </p>
          <a
            href="/predicciones/grupos"
            className="mt-4 inline-block font-marcador text-sm font-bold uppercase text-red"
          >
            Ir a grupos ›
          </a>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={editing !== null ? "pb-44" : "pb-8"}>
      {/* Stage progress bar */}
      <StageBar progress={{ eliminatorias: elimPct }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-none">Cuadro</h1>
        <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted">
          Eliminatorias · resultado en 90 minutos · {completedCount} de 32 partidos
          {saving && " · guardando…"}
        </p>
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mx-4 mb-3 rounded-xl border border-red/30 bg-red/8 px-3 py-2">
          <p className="text-sm font-semibold text-red">Las predicciones están bloqueadas.</p>
        </div>
      )}

      {/* View toggle: Rondas / Cuadro */}
      <div className="px-4 pb-3">
        <div className="bg-surface-sunken rounded-lg p-1 flex">
          <button
            type="button"
            onClick={() => {
              setViewMode("rondas");
              setEditing(null);
              setAwaitingWinnerMatch(null);
            }}
            className={cn(
              "flex-1 text-center py-2 rounded-md font-marcador uppercase text-xs tracking-wider transition-all",
              viewMode === "rondas" ? "bg-surface text-ink shadow" : "text-ink-muted"
            )}
          >
            Rondas
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("cuadro");
              setEditing(null);
              setAwaitingWinnerMatch(null);
            }}
            className={cn(
              "flex-1 text-center py-2 rounded-md font-marcador uppercase text-xs tracking-wider transition-all",
              viewMode === "cuadro" ? "bg-surface text-ink shadow" : "text-ink-muted"
            )}
          >
            Cuadro
          </button>
        </div>
      </div>

      {viewMode === "rondas" && (
        <>
          {/* Round selector */}
          <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 pt-1 no-scrollbar">
            {ROUND_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveRound(tab.key);
                  setEditing(null);
                  setAwaitingWinnerMatch(null);
                }}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 font-marcador text-xs font-bold uppercase transition-colors",
                  activeRound === tab.key
                    ? "bg-red text-white"
                    : "border border-border bg-surface text-ink-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tie cards */}
          <div className="flex flex-col gap-2 px-4">
            {activeRoundMatches.map((match) => {
              const homeBp = bpMap.get(`${match.match_number}:home`);
              const awayBp = bpMap.get(`${match.match_number}:away`);

              const homeTeam = match.home_team_id ? teamsMap.get(match.home_team_id) ?? null : null;
              const awayTeam = match.away_team_id ? teamsMap.get(match.away_team_id) ?? null : null;

              const homeSourceLabel = buildSourceLabel(homeBp, match.home_placeholder);
              const awaySourceLabel = buildSourceLabel(awayBp, match.away_placeholder);

              const pred = predictions.get(match.match_number);
              const homeScore = pred !== undefined ? pred.home_score : null;
              const awayScore = pred !== undefined ? pred.away_score : null;
              const isCompleteDraw =
                homeScore !== null && awayScore !== null && homeScore === awayScore;

              const editingView = getKnockoutEditingViewState(
                { editing, awaitingWinnerMatch },
                match.match_number,
                isCompleteDraw
              );

              const roundLabel = ROUND_LABELS[match.stage] ?? match.stage;

              return (
                <TieCard
                  key={match.match_number}
                  matchNumber={match.match_number}
                  roundLabel={roundLabel}
                  home={{
                    sourceLabel: homeSourceLabel,
                    team: homeTeam
                      ? { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji, code: homeTeam.code }
                      : null,
                  }}
                  away={{
                    sourceLabel: awaySourceLabel,
                    team: awayTeam
                      ? { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji, code: awayTeam.code }
                      : null,
                  }}
                  homeScore={homeScore}
                  awayScore={awayScore}
                  selected={editingView.selected}
                  focusedSide={editingView.focusedSide}
                  sourceGroups={[...getSourceGroups(homeBp), ...getSourceGroups(awayBp)]}
                  penaltyWinner={pred?.penalty_winner ?? null}
                  isLocked={isLocked}
                  onTileTap={(side) => handleTileTap(match.match_number, side)}
                  onWinnerSelect={(side) => handlePenaltyWinner(match.match_number, side)}
                />
              );
            })}

            {activeRoundMatches.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">
                No hay partidos en esta ronda todavía.
              </p>
            )}
          </div>

          {/* Score pad (docked) */}
          <ScorePad
            open={getKnockoutEditingViewState({ editing, awaitingWinnerMatch }, editing?.matchNum ?? -1).scorePadOpen}
            teamName={editingTeam?.name ?? "Por decidir"}
            flag={<Flag emoji={editingTeam?.flag_emoji ?? ""} size={18} />}
            onDigit={handleDigit}
            onClose={() => setEditing(null)}
          />
        </>
      )}

      {viewMode === "cuadro" && (
        <>
          <ClassicBracket
            matches={bracketMatchViews}
            predictions={predictions}
            onSelectMatch={(matchNumber) => setCuadroSelectedMatch(matchNumber)}
          />

          {cuadroSelectedMatchData && (
            <MatchResultDialog
              open={cuadroSelectedMatch !== null}
              onClose={() => setCuadroSelectedMatch(null)}
              matchNumber={cuadroSelectedMatchData.match_number}
              roundLabel={ROUND_LABELS[cuadroSelectedMatchData.stage] ?? cuadroSelectedMatchData.stage}
              homeTeam={cuadroSelectedMatchData.homeTeam}
              awayTeam={cuadroSelectedMatchData.awayTeam}
              homeSourceLabel={cuadroSelectedMatchData.homeSourceLabel}
              awaySourceLabel={cuadroSelectedMatchData.awaySourceLabel}
              homeScore={cuadroSelectedPred?.home_score ?? null}
              awayScore={cuadroSelectedPred?.away_score ?? null}
              penaltyWinner={cuadroSelectedPred?.penalty_winner ?? null}
              isLocked={isLocked}
              onSave={handleCuadroSave}
            />
          )}
        </>
      )}
    </div>
  );
}
