"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag } from "@/components/ui/flag";
import { useToast } from "@/components/ui/use-toast";
import { recalculateAllScores } from "@/lib/scoring/calculator";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
}

interface Match {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string;
  home_team_id: number;
  away_team_id: number;
  home_placeholder: string;
  away_placeholder: string;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: number | null;
  is_finished: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Octavos",
  round_of_16: "Cuartos",
  quarter_final: "Semifinales",
  semi_final: "Semifinales",
  third_place: "3er Puesto",
  final: "Final",
};

export default function AdminResultadosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [editing, setEditing] = useState<Record<number, { home: string; away: string; penalty: string }>>({});
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [teamsRes, matchesRes] = await Promise.all([
        supabase.from("teams").select("*").order("id"),
        supabase.from("matches").select("*").order("match_number"),
      ]);
      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
    }
    load();
  }, []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const handleSaveResult = async (match: Match) => {
    const edit = editing[match.id];
    if (!edit) return;

    const homeScore = parseInt(edit.home);
    const awayScore = parseInt(edit.away);
    if (isNaN(homeScore) || isNaN(awayScore)) {
      toast({ title: "Introduce puntuaciones válidas", variant: "destructive" });
      return;
    }

    const updates: Record<string, number | boolean | null> = {
      home_score: homeScore,
      away_score: awayScore,
      is_finished: true,
    };

    if (homeScore === awayScore && match.stage !== "group" && edit.penalty) {
      updates.penalty_winner_team_id = parseInt(edit.penalty);
    }

    const { error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", match.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, ...updates }
            : m
        )
      );
      toast({ title: `P${match.match_number} resultado guardado` });
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    const result = await recalculateAllScores(supabase);
    setRecalculating(false);

    if (result.success) {
      toast({ title: "Puntuaciones recalculadas para todos los usuarios" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const stages = ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resultados</h1>
        <Button onClick={handleRecalculate} disabled={recalculating} variant="default">
          {recalculating ? "Recalculando..." : "Recalcular Puntuaciones"}
        </Button>
      </div>

      <Tabs defaultValue="group">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {stages.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {STAGE_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>

        {stages.map((stage) => {
          const stageMatches = matches.filter((m) => m.stage === stage);
          return (
            <TabsContent key={stage} value={stage}>
              <div className="space-y-2">
                {stageMatches.map((match) => {
                  const home = teamsMap.get(match.home_team_id);
                  const away = teamsMap.get(match.away_team_id);
                  const edit = editing[match.id] || {
                    home: match.home_score?.toString() || "",
                    away: match.away_score?.toString() || "",
                    penalty: match.penalty_winner_team_id?.toString() || "",
                  };

                  return (
                    <Card key={match.id} className={match.is_finished ? "border-primary/30" : ""}>
                      <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground w-8">P{match.match_number}</span>

                        <span className="text-sm flex-1 min-w-0 truncate flex items-center gap-1">
                          {home ? <><Flag emoji={home.flag_emoji} size={16} />{home.code}</> : match.home_placeholder || "TBD"}
                        </span>

                        <Input
                          type="number"
                          className="w-14 h-8 text-center text-sm p-0"
                          value={edit.home}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [match.id]: { ...edit, home: e.target.value },
                            }))
                          }
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          className="w-14 h-8 text-center text-sm p-0"
                          value={edit.away}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [match.id]: { ...edit, away: e.target.value },
                            }))
                          }
                        />

                        <span className="text-sm flex-1 min-w-0 truncate text-right flex items-center gap-1 justify-end">
                          {away ? <>{away.code}<Flag emoji={away.flag_emoji} size={16} /></> : match.away_placeholder || "TBD"}
                        </span>

                        {match.is_finished ? (
                          <Badge variant="default" className="text-xs">Final</Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSaveResult(match)}
                          >
                            Guardar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
