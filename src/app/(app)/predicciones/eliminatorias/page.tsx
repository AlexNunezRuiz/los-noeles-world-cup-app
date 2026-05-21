"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import { StageBar } from "@/components/porra/stage-bar";
import { TieCard } from "@/components/predictions/tie-card";
import { ScorePad } from "@/components/predictions/score-pad";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

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

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const ROUND_TABS = [
  { key: "round_of_32",   label: "16avos",  stages: ["round_of_32"] },
  { key: "round_of_16",   label: "Octavos", stages: ["round_of_16"] },
  { key: "quarter_final", label: "Cuartos", stages: ["quarter_final"] },
  { key: "semi_final",    label: "Semis",   stages: ["semi_final"] },
  { key: "final",         label: "Final",   stages: ["third_place", "final"] },
] as const;

type RoundKey = (typeof ROUND_TABS)[number]["key"];

const ROUND_LABELS: Record<string, string> = {
  round_of_32:   "16avos",
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EliminatoriasPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [predictions, setPredictions] = useState<Map<number, KnockoutPrediction>>(new Map());
  const [bracketPositions, setBracketPositions] = useState<BracketPosition[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [matchIdMap, setMatchIdMap] = useState<Map<number, number>>(new Map());
  const [activeRound, setActiveRound] = useState<RoundKey>("round_of_32");
  const [editing, setEditing] = useState<{ matchNum: number; side: "home" | "away" } | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const supabase = createClient();

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
      ] = await Promise.all([
        supabase.from("teams").select("*").order("id"),
        supabase.from("matches").select("*").neq("stage", "group").order("match_number"),
        supabase.from("predicted_group_standings").select("*").eq("user_id", user.id),
        supabase.from("knockout_bracket_positions").select("*"),
        supabase.from("match_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_config").select("*").eq("key", "predictions_locked").single(),
      ]);

      setTeams(teamsRes.data || []);
      setIsLocked(configRes.data?.value === "true");

      // Build match_number -> id map
      const idMap = new Map<number, number>();
      for (const m of matchesRes.data || []) {
        idMap.set(m.match_number, m.id);
      }
      setMatchIdMap(idMap);

      // Build group standings
      const groupStandings = new Map<string, TeamStanding[]>();
      for (const group of GROUPS) {
        const gs = (standingsRes.data || [])
          .filter((s: { group_letter: string }) => s.group_letter === group)
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

      const bestThirds = getBestThirds(groupStandings);

      // Build predictions map (match_number based)
      const predMap = new Map<number, KnockoutPrediction>();
      for (const p of predsRes.data || []) {
        const matchNum = Array.from(idMap.entries()).find(([, id]) => id === p.match_id)?.[0];
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
      setPredictions(predMap);

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

      const bpList: BracketPosition[] = (bracketPosRes.data || []).map((bp: {
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
    if (bracketMatches.length === 0) return;
    // Bracket re-resolution is triggered by data loads; predictions state
    // is used for score overlay only — bracket is recomputed on next load.
  }, [predictions]);

  // ── Prediction save ────────────────────────────────────────────────────────

  const savePrediction = useCallback(
    async (matchNumber: number, homeScore: number, awayScore: number) => {
      const matchId = matchIdMap.get(matchNumber);
      if (!userId || !matchId || isLocked) return;
      setSaving(true);
      const pred = predictions.get(matchNumber);
      await supabase.from("match_predictions").upsert(
        {
          user_id: userId,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
          penalty_winner: pred?.penalty_winner ?? null,
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
          penalty_winner: penaltyWinner ?? null,
        },
        { onConflict: "user_id,match_id" }
      );
    },
    [matchIdMap, userId, isLocked, supabase]
  );

  const handleScoreChange = useCallback(
    (matchNumber: number, homeScore: number, awayScore: number) => {
      setPredictions((prev) => {
        const next = new Map(prev);
        const existing = prev.get(matchNumber);
        next.set(matchNumber, {
          match_id: matchIdMap.get(matchNumber) || 0,
          match_number: matchNumber,
          home_score: homeScore,
          away_score: awayScore,
          penalty_winner: existing?.penalty_winner,
        });
        return next;
      });

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        savePrediction(matchNumber, homeScore, awayScore);
      }, 800);
    },
    [matchIdMap, savePrediction]
  );

  const handlePenaltyWinner = useCallback(
    (matchNumber: number, winner: "home" | "away") => {
      setPredictions((prev) => {
        const next = new Map(prev);
        const existing = prev.get(matchNumber);
        if (existing) {
          next.set(matchNumber, { ...existing, penalty_winner: winner });
        }
        return next;
      });
      const pred = predictions.get(matchNumber);
      if (pred) {
        savePredictionFull(matchNumber, pred.home_score, pred.away_score, winner);
      }
    },
    [predictions, savePredictionFull]
  );

  // ── ScorePad / TileTap ────────────────────────────────────────────────────

  const activeRoundMatches = bracketMatches
    .filter((m) => {
      const tab = ROUND_TABS.find((t) => t.key === activeRound);
      return tab ? (tab.stages as readonly string[]).includes(m.stage) : false;
    })
    .sort((a, b) => a.match_number - b.match_number);

  const handleTileTap = useCallback(
    (matchNum: number, side: "home" | "away") => {
      if (isLocked) return;
      setEditing({ matchNum, side });
    },
    [isLocked]
  );

  const handleDigit = useCallback(
    (n: number) => {
      if (!editing) return;
      const { matchNum, side } = editing;
      const pred = predictions.get(matchNum);
      const currentHome = pred?.home_score ?? 0;
      const currentAway = pred?.away_score ?? 0;
      const newHome = side === "home" ? n : currentHome;
      const newAway = side === "away" ? n : currentAway;
      handleScoreChange(matchNum, newHome, newAway);

      // Auto-advance
      if (side === "home") {
        setEditing({ matchNum, side: "away" });
      } else {
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
    [editing, predictions, handleScoreChange, activeRoundMatches]
  );

  // ── Derived data ──────────────────────────────────────────────────────────

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const elimPct = Math.round((predictions.size / 32) * 100);

  // Build a lookup: match_number + slot -> BracketPosition
  const bpMap = new Map<string, BracketPosition>();
  for (const bp of bracketPositions) {
    bpMap.set(`${bp.match_number}:${bp.slot}`, bp);
  }

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
          Eliminatorias · {predictions.size} de 32 partidos
          {saving && " · guardando…"}
        </p>
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mx-4 mb-3 rounded-xl border border-red/30 bg-red/8 px-3 py-2">
          <p className="text-sm font-semibold text-red">Las predicciones están bloqueadas.</p>
        </div>
      )}

      {/* Round selector */}
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 pt-1 no-scrollbar">
        {ROUND_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveRound(tab.key);
              setEditing(null);
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

          const isSelected = editing?.matchNum === match.match_number;
          const focusedSide = isSelected ? editing?.side ?? null : null;

          const roundLabel = ROUND_LABELS[match.stage] ?? match.stage;

          return (
            <TieCard
              key={match.match_number}
              matchNumber={match.match_number}
              roundLabel={roundLabel}
              home={{
                sourceLabel: homeSourceLabel,
                team: homeTeam
                  ? { name: homeTeam.name, flag_emoji: homeTeam.flag_emoji }
                  : null,
              }}
              away={{
                sourceLabel: awaySourceLabel,
                team: awayTeam
                  ? { name: awayTeam.name, flag_emoji: awayTeam.flag_emoji }
                  : null,
              }}
              homeScore={homeScore}
              awayScore={awayScore}
              selected={isSelected}
              focusedSide={focusedSide}
              onTileTap={(side) => handleTileTap(match.match_number, side)}
            />
          );
        })}

        {activeRoundMatches.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">
            No hay partidos en esta ronda todavía.
          </p>
        )}
      </div>

      {/* Penalty winner (draw case) — shown inline below selected card */}
      {editing && (() => {
        const match = bracketMatches.find((m) => m.match_number === editing.matchNum);
        if (!match) return null;
        const pred = predictions.get(match.match_number);
        const isDraw =
          pred !== undefined &&
          pred.home_score === pred.away_score;
        if (!isDraw) return null;
        const homeTeam = match.home_team_id ? teamsMap.get(match.home_team_id) : undefined;
        const awayTeam = match.away_team_id ? teamsMap.get(match.away_team_id) : undefined;
        if (!homeTeam || !awayTeam) return null;
        return (
          <div className="mx-4 mt-2 rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Desempate penaltis
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handlePenaltyWinner(editing.matchNum, "home")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 font-marcador text-xs font-bold uppercase transition-colors",
                  pred?.penalty_winner === "home"
                    ? "border-red bg-red text-white"
                    : "border-border bg-surface text-ink"
                )}
              >
                <Flag emoji={homeTeam.flag_emoji} size={14} />
                {homeTeam.code}
              </button>
              <button
                type="button"
                onClick={() => handlePenaltyWinner(editing.matchNum, "away")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 font-marcador text-xs font-bold uppercase transition-colors",
                  pred?.penalty_winner === "away"
                    ? "border-red bg-red text-white"
                    : "border-border bg-surface text-ink"
                )}
              >
                <Flag emoji={awayTeam.flag_emoji} size={14} />
                {awayTeam.code}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Score pad (docked) */}
      <ScorePad
        open={editing !== null}
        teamName={editingTeam?.name ?? "Por decidir"}
        flag={<Flag emoji={editingTeam?.flag_emoji ?? ""} size={18} />}
        onDigit={handleDigit}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
