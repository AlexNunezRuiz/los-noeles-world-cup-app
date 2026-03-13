"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/flag";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string;
}

interface Standing {
  team_id: number;
  group_letter: string;
  position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function ClasificadosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [teamsRes, standingsRes] = await Promise.all([
        supabase.from("teams").select("*").order("id"),
        supabase.from("predicted_group_standings").select("*").eq("user_id", user.id).order("group_letter").order("position"),
      ]);

      setTeams(teamsRes.data || []);
      setStandings(standingsRes.data || []);
    }
    load();
  }, []);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const qualifiedTeams = standings.filter((s) => s.position <= 2);
  const thirds = standings
    .filter((s) => s.position === 3)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });
  const bestThirds = thirds.slice(0, 8);

  const allQualified = [...qualifiedTeams, ...bestThirds];

  if (standings.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Equipos Clasificados</h1>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Primero completa los pronósticos de la fase de grupos y guarda las clasificaciones.
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
      <div>
        <h1 className="text-2xl font-bold">Equipos Clasificados</h1>
        <p className="text-muted-foreground text-sm">
          32 equipos avanzan a la fase eliminatoria
        </p>
      </div>

      {/* Group winners and runners-up */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GROUPS.map((group) => {
          const groupStandings = standings.filter((s) => s.group_letter === group);
          const first = groupStandings.find((s) => s.position === 1);
          const second = groupStandings.find((s) => s.position === 2);
          const third = groupStandings.find((s) => s.position === 3);
          const thirdQualifies = bestThirds.some((bt) => bt.team_id === third?.team_id);

          return (
            <Card key={group}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Grupo {group}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {[first, second, third].map((s, i) => {
                  if (!s) return null;
                  const team = teamsMap.get(s.team_id);
                  const qualifies = i < 2 || (i === 2 && thirdQualifies);
                  return (
                    <div
                      key={s.team_id}
                      className={`flex items-center justify-between p-1.5 rounded ${
                        qualifies ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold w-4">{i + 1}º</span>
                        <Flag emoji={team?.flag_emoji || ""} size={18} />
                        <span className="text-sm">{team?.name}</span>
                      </div>
                      {qualifies && (
                        <Badge variant="default" className="text-xs">
                          {i < 2 ? "Clasif." : "3º mejor"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen: {allQualified.length} Clasificados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {allQualified.map((s) => {
              const team = teamsMap.get(s.team_id);
              return (
                <Badge key={s.team_id} variant="outline" className="text-sm py-1 px-2">
                  <Flag emoji={team?.flag_emoji || ""} size={16} className="mr-1" />{team?.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Link href="/predicciones/grupos">
          <Button variant="outline">← Fase de Grupos</Button>
        </Link>
        <Link href="/predicciones/eliminatorias">
          <Button>Eliminatorias →</Button>
        </Link>
      </div>
    </div>
  );
}
