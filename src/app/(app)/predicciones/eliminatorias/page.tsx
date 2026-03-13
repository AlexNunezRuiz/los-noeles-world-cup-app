"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { KnockoutBracket } from "@/components/predictions/KnockoutBracket";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "@/lib/tournament/bracket";
import { getBestThirds, type TeamStanding } from "@/lib/tournament/standings";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function EliminatoriasPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [predictions, setPredictions] = useState<Map<number, KnockoutPrediction>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [matchIdMap, setMatchIdMap] = useState<Map<number, number>>(new Map()); // match_number -> match id
  const saveTimeout = useRef<NodeJS.Timeout>();
  useToast();
  const supabase = createClient();

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
          .map((s: { team_id: number; position: number; points: number; goals_for: number; goals_against: number; goal_difference: number }) => ({
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
      const knockoutMatches: BracketMatch[] = (matchesRes.data || []).map((m: { match_number: number; stage: string; home_team_id?: number; away_team_id?: number; home_placeholder?: string; away_placeholder?: string }) => ({
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      }));

      const bracketPositions = (bracketPosRes.data || []).map((bp: { match_number: number; slot: string; source_type: string; source_group?: string; source_match_number?: number; best_third_pool?: string }) => ({
        match_number: bp.match_number,
        slot: bp.slot as "home" | "away",
        source_type: bp.source_type,
        source_group: bp.source_group,
        source_match_number: bp.source_match_number,
        best_third_pool: bp.best_third_pool,
      }));

      const populated = populateKnockoutBracket(
        groupStandings,
        bestThirds,
        knockoutMatches,
        predMap,
        bracketPositions
      );

      setBracketMatches(populated);
    }
    load();
  }, []);

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

      // Debounced save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        savePrediction(matchNumber, homeScore, awayScore);
      }, 800);
    },
    [matchIdMap, userId]
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

      // Save immediately
      const pred = predictions.get(matchNumber);
      if (pred) {
        savePredictionFull(matchNumber, pred.home_score, pred.away_score, winner);
      }
    },
    [predictions, matchIdMap, userId]
  );

  const savePrediction = async (matchNumber: number, homeScore: number, awayScore: number) => {
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
        penalty_winner: pred?.penalty_winner || null,
      },
      { onConflict: "user_id,match_id" }
    );

    setSaving(false);
  };

  const savePredictionFull = async (
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
        penalty_winner: penaltyWinner || null,
      },
      { onConflict: "user_id,match_id" }
    );
  };

  // Re-populate bracket when predictions change
  useEffect(() => {
    if (bracketMatches.length === 0) return;
    // The bracket auto-updates from the KnockoutBracket display
  }, [predictions]);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  if (bracketMatches.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Fase Eliminatoria</h1>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Primero completa la fase de grupos y guarda las clasificaciones.
            </p>
            <Link href="/predicciones/grupos">
              <Button className="mt-4">Ir a Fase de Grupos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fase Eliminatoria</h1>
          <p className="text-muted-foreground text-sm">
            Rellena los resultados desde Octavos hasta la Final
          </p>
        </div>
        {saving && <Badge variant="secondary">Guardando...</Badge>}
      </div>

      {isLocked && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Las predicciones están bloqueadas.</p>
          </CardContent>
        </Card>
      )}

      <KnockoutBracket
        matches={bracketMatches}
        teams={teamsMap}
        isLocked={isLocked}
        onScoreChange={handleScoreChange}
        onPenaltyWinner={handlePenaltyWinner}
      />

      <div className="flex justify-between">
        <Link href="/predicciones/clasificados">
          <Button variant="outline">← Clasificados</Button>
        </Link>
        <Link href="/predicciones/premios">
          <Button>Premios →</Button>
        </Link>
      </div>
    </div>
  );
}
