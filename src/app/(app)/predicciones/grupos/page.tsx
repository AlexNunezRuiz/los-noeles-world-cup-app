"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { GroupMatchCard } from "@/components/predictions/GroupMatchCard";
import { GroupStandingsTable } from "@/components/predictions/GroupStandingsTable";
import { calculateGroupStandings, findTiedTeams, type TeamStanding } from "@/lib/tournament/standings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string;
}

interface Match {
  id: number;
  match_number: number;
  group_letter: string;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
}

interface Prediction {
  match_id: number;
  home_score: number;
  away_score: number;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function GruposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map());
  const [standings, setStandings] = useState<Map<string, TeamStanding[]>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [hasShownBizum, setHasShownBizum] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const supabase = createClient();

  // Load data
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [teamsRes, matchesRes, predsRes, configRes] = await Promise.all([
        supabase.from("teams").select("*").order("id"),
        supabase.from("matches").select("*").eq("stage", "group").order("match_number"),
        supabase.from("match_predictions").select("*").eq("user_id", user.id),
        supabase.from("tournament_config").select("*").eq("key", "predictions_locked").single(),
      ]);

      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
      setIsLocked(configRes.data?.value === "true");

      const predMap = new Map<number, Prediction>();
      for (const p of predsRes.data || []) {
        predMap.set(p.match_id, {
          match_id: p.match_id,
          home_score: p.home_score,
          away_score: p.away_score,
        });
      }
      setPredictions(predMap);
    }
    load();
  }, []);

  // Recalculate standings when predictions change
  useEffect(() => {
    if (teams.length === 0 || matches.length === 0) return;

    const newStandings = new Map<string, TeamStanding[]>();
    for (const group of GROUPS) {
      const groupTeams = teams.filter((t) => t.group_letter === group);
      const groupMatches = matches.filter((m) => m.group_letter === group);

      const matchResults = groupMatches.map((m) => {
        const pred = predictions.get(m.id);
        return {
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_score: pred?.home_score ?? 0,
          away_score: pred?.away_score ?? 0,
        };
      });

      const gs = calculateGroupStandings(
        groupTeams.map((t) => t.id),
        matchResults
      );
      newStandings.set(group, gs);
    }
    setStandings(newStandings);
  }, [teams, matches, predictions]);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const handleScoreChange = useCallback(
    (matchId: number, homeScore: number, awayScore: number) => {
      setPredictions((prev) => {
        const next = new Map(prev);
        next.set(matchId, { match_id: matchId, home_score: homeScore, away_score: awayScore });
        return next;
      });

      // Debounced save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        savePrediction(matchId, homeScore, awayScore);
      }, 800);
    },
    [userId]
  );

  const savePrediction = async (matchId: number, homeScore: number, awayScore: number) => {
    if (!userId || isLocked) return;
    setSaving(true);

    const { error } = await supabase
      .from("match_predictions")
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          home_score: homeScore,
          away_score: awayScore,
        },
        { onConflict: "user_id,match_id" }
      );

    setSaving(false);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    }

    // Show Bizum reminder on first prediction
    if (!hasShownBizum) {
      setHasShownBizum(true);
      toast({
        title: "Recuerda enviar el Bizum",
        description: "Para validar tu participación, envía un Bizum al +34627151087",
      });
    }
  };

  const handleMoveTeam = useCallback(
    (group: string, teamId: number, direction: "up" | "down") => {
      setStandings((prev) => {
        const next = new Map(prev);
        const gs = [...(next.get(group) || [])];
        const idx = gs.findIndex((s) => s.team_id === teamId);
        if (idx === -1) return prev;

        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= gs.length) return prev;

        // Swap positions
        const tmpPos = gs[idx].position;
        gs[idx] = { ...gs[idx], position: gs[swapIdx].position };
        gs[swapIdx] = { ...gs[swapIdx], position: tmpPos };
        gs.sort((a, b) => a.position - b.position);

        next.set(group, gs);
        return next;
      });
    },
    []
  );

  const saveStandings = async () => {
    if (!userId || isLocked) return;
    setSaving(true);

    const rows: Array<{
      user_id: string;
      group_letter: string;
      team_id: number;
      position: number;
      points: number;
      goal_difference: number;
      goals_for: number;
      goals_against: number;
      is_manual_override: boolean;
    }> = [];

    for (const [group, gs] of Array.from(standings.entries())) {
      for (const s of gs) {
        rows.push({
          user_id: userId,
          group_letter: group,
          team_id: s.team_id,
          position: s.position,
          points: s.points,
          goal_difference: s.goal_difference,
          goals_for: s.goals_for,
          goals_against: s.goals_against,
          is_manual_override: false,
        });
      }
    }

    // Delete existing and insert new
    await supabase.from("predicted_group_standings").delete().eq("user_id", userId);
    const { error } = await supabase.from("predicted_group_standings").insert(rows);

    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar clasificaciones", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Clasificaciones guardadas" });
    }
  };

  const completedGroups = GROUPS.filter((g) => {
    const groupMatches = matches.filter((m) => m.group_letter === g);
    return groupMatches.every((m) => predictions.has(m.id));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fase de Grupos</h1>
          <p className="text-muted-foreground text-sm">
            Rellena los resultados de los 72 partidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Badge variant="secondary">Guardando...</Badge>}
          <Badge variant="outline">{completedGroups.length}/12 grupos</Badge>
        </div>
      </div>

      {isLocked && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Las predicciones están bloqueadas.</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="A">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {GROUPS.map((g) => (
            <TabsTrigger
              key={g}
              value={g}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Grupo {g}
              {completedGroups.includes(g) && <span className="ml-1 text-xs">✓</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {GROUPS.map((group) => {
          const groupMatches = matches.filter((m) => m.group_letter === group);
          const gs = standings.get(group) || [];
          const tiedTeams = findTiedTeams(gs).flat();

          return (
            <TabsContent key={group} value={group} className="space-y-4">
              {/* Matches */}
              <div className="space-y-2">
                {groupMatches.map((match) => {
                  const pred = predictions.get(match.id);
                  const homeTeam = teamsMap.get(match.home_team_id);
                  const awayTeam = teamsMap.get(match.away_team_id);
                  if (!homeTeam || !awayTeam) return null;

                  return (
                    <GroupMatchCard
                      key={match.id}
                      matchId={match.id}
                      matchNumber={match.match_number}
                      homeTeam={homeTeam}
                      awayTeam={awayTeam}
                      homeScore={pred?.home_score ?? 0}
                      awayScore={pred?.away_score ?? 0}
                      isLocked={isLocked}
                      matchDate={match.match_date}
                      onScoreChange={handleScoreChange}
                    />
                  );
                })}
              </div>

              {/* Standings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Clasificación Grupo {group}</CardTitle>
                </CardHeader>
                <CardContent>
                  <GroupStandingsTable
                    standings={gs}
                    teams={teamsMap}
                    tiedTeamIds={tiedTeams}
                    isLocked={isLocked}
                    onMoveTeam={(teamId, dir) => handleMoveTeam(group, teamId, dir)}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-between items-center">
        <Button onClick={saveStandings} disabled={isLocked || saving}>
          Guardar Clasificaciones
        </Button>
        <Link href="/predicciones/clasificados">
          <Button variant="outline">Ver Clasificados →</Button>
        </Link>
      </div>
    </div>
  );
}
