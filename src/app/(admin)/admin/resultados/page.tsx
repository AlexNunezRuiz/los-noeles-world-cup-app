"use client";

import { useEffect, useState } from "react";
import { Check, RefreshCw, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flag } from "@/components/ui/flag";
import { useToast } from "@/components/ui/use-toast";
import { recalculateAllScores, type ScoreEvent } from "@/lib/scoring/calculator";
import {
  assertNotificationInsertSucceeded,
  buildNotificationRows,
  scoreEventsForMatchNotifications,
} from "@/lib/notifications/internal";

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
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
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

  const matchLabel = (match: Match) => {
    const home = teamsMap.get(match.home_team_id);
    const away = teamsMap.get(match.away_team_id);
    return `${home?.code ?? match.home_placeholder ?? "TBD"} ${match.home_score ?? "-"}-${match.away_score ?? "-"} ${away?.code ?? match.away_placeholder ?? "TBD"}`;
  };

  const publishGlobalNotification = async ({
    type,
    title,
    body,
    link,
  }: {
    type: "result_update" | "ranking_update";
    title: string;
    body: string;
    link: string;
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profiles } = await supabase.from("profiles").select("id");
    const rows = buildNotificationRows({
      profiles: (profiles || []) as Array<{ id: string }>,
      type,
      actorUserId: user.id,
      title,
      body,
      link,
    });

    if (rows.length > 0) {
      assertNotificationInsertSucceeded(
        await supabase.from("notifications").insert(rows),
        "No se pudo publicar la notificacion global"
      );
    }
    return user.id;
  };

  const publishCorrectPredictionNotifications = async (match: Match, actorUserId: string | null, events: ScoreEvent[] = []) => {
    const matchingEvents = scoreEventsForMatchNotifications(events, match.id);
    if (matchingEvents.length === 0) return;

    assertNotificationInsertSucceeded(
      await supabase.from("notifications").insert(
        matchingEvents.map((event) => ({
          user_id: event.user_id,
          actor_user_id: actorUserId,
          type: "correct_prediction",
          title: `+${event.points} pts en P${match.match_number}`,
          body: `${matchLabel(match)}: ${event.descriptions.join(", ")}`,
          link: `/resultados`,
        }))
      ),
      "No se pudieron publicar las notificaciones de aciertos"
    );
  };

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

    if (homeScore === awayScore && match.stage !== "group" && match.home_team_id && match.away_team_id && !edit.penalty) {
      toast({ title: "Elige ganador por penaltis", variant: "destructive" });
      return;
    }

    if (homeScore !== awayScore || match.stage === "group") {
      updates.penalty_winner_team_id = null;
    } else if (edit.penalty) {
      updates.penalty_winner_team_id = parseInt(edit.penalty);
    }

    const { error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", match.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const updatedMatch = { ...match, ...updates } as Match;
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, ...updates }
            : m
        )
      );
      toast({ title: `P${match.match_number} resultado guardado` });
      try {
        const actorUserId = await publishGlobalNotification({
          type: "result_update",
          title: "Nuevo resultado",
          body: `Resultado actualizado: ${matchLabel(updatedMatch)}`,
          link: "/resultados",
        });

        const recalc = await recalculateAllScores(supabase);
        if (recalc.success) {
          await publishCorrectPredictionNotifications(updatedMatch, actorUserId, recalc.events ?? []);
          await publishGlobalNotification({
            type: "ranking_update",
            title: "Clasificacion actualizada",
            body: "La clasificacion se ha actualizado tras el ultimo resultado.",
            link: "/ranking",
          });
        } else {
          toast({
            title: "Resultado guardado, pero no se recalculo la clasificacion",
            description: recalc.error,
            variant: "destructive",
          });
        }
      } catch (notificationError) {
        toast({
          title: "Resultado guardado, pero fallo la notificacion",
          description:
            notificationError instanceof Error
              ? notificationError.message
              : "No se pudieron crear las notificaciones internas.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteResult = async (match: Match) => {
    const updates = {
      home_score: null,
      away_score: null,
      penalty_winner_team_id: null,
      is_finished: false,
    };

    const { error } = await supabase.from("matches").update(updates).eq("id", match.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const updatedMatch = { ...match, ...updates };
    setMatches((prev) => prev.map((m) => (m.id === match.id ? updatedMatch : m)));
    setEditing((prev) => ({
      ...prev,
      [match.id]: { home: "", away: "", penalty: "" },
    }));
    toast({ title: `P${match.match_number} resultado eliminado` });

    try {
      await publishGlobalNotification({
        type: "result_update",
        title: "Resultado eliminado",
        body: `Resultado eliminado: P${match.match_number}`,
        link: "/resultados",
      });

      const recalc = await recalculateAllScores(supabase);
      if (recalc.success) {
        await publishGlobalNotification({
          type: "ranking_update",
          title: "Clasificacion actualizada",
          body: "La clasificacion se ha actualizado tras eliminar un resultado.",
          link: "/ranking",
        });
      } else {
        toast({
          title: "Resultado eliminado, pero no se recalculo la clasificacion",
          description: recalc.error,
          variant: "destructive",
        });
      }
    } catch (notificationError) {
      toast({
        title: "Resultado eliminado, pero fallo la notificacion",
        description:
          notificationError instanceof Error
            ? notificationError.message
            : "No se pudieron crear las notificaciones internas.",
        variant: "destructive",
      });
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    const result = await recalculateAllScores(supabase);
    setRecalculating(false);

    if (result.success) {
      await publishGlobalNotification({
        type: "ranking_update",
        title: "Clasificacion actualizada",
        body: "La clasificacion se ha recalculado.",
        link: "/ranking",
      });
      toast({ title: "Puntuaciones recalculadas para todos los usuarios" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const stages = ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Resultados</h1>
        <Button onClick={handleRecalculate} disabled={recalculating} variant="default">
          {recalculating ? "Recalculando..." : "Recalcular Puntuaciones"}
        </Button>
      </div>

      <Tabs defaultValue="group">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {stages.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs">
              {STAGE_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>

        {stages.map((stage) => {
          const stageMatches = matches.filter((m) => m.stage === stage);
          return (
            <TabsContent key={stage} value={stage}>
              <div className="space-y-2 mt-3">
                {stageMatches.map((match) => {
                  const home = teamsMap.get(match.home_team_id);
                  const away = teamsMap.get(match.away_team_id);
                  const edit = editing[match.id] || {
                    home: match.home_score?.toString() || "",
                    away: match.away_score?.toString() || "",
                    penalty: match.penalty_winner_team_id?.toString() || "",
                  };

                  return (
                    <Card key={match.id} className={match.is_finished ? "border-green/30 bg-surface" : "bg-surface"}>
                      <CardContent className="p-3 flex items-center gap-2 flex-wrap">
                        <span className="font-marcador text-xs text-ink-faint w-8">P{match.match_number}</span>

                        <span className="text-sm flex-1 min-w-0 truncate flex items-center gap-1 text-ink font-sans">
                          {home ? <><Flag emoji={home.flag_emoji} size={16} />{home.code}</> : match.home_placeholder || "TBD"}
                        </span>

                        <Input
                          type="number"
                          className="w-14 h-8 text-center text-sm p-0 font-marcador"
                          value={edit.home}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [match.id]: { ...edit, home: e.target.value },
                            }))
                          }
                        />
                        <span className="text-ink-muted font-marcador">-</span>
                        <Input
                          type="number"
                          className="w-14 h-8 text-center text-sm p-0 font-marcador"
                          value={edit.away}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [match.id]: { ...edit, away: e.target.value },
                            }))
                          }
                        />

                        <span className="text-sm flex-1 min-w-0 truncate text-right flex items-center gap-1 justify-end text-ink font-sans">
                          {away ? <>{away.code}<Flag emoji={away.flag_emoji} size={16} /></> : match.away_placeholder || "TBD"}
                        </span>

                        {edit.home !== "" && edit.away !== "" && parseInt(edit.home) === parseInt(edit.away) && match.stage !== "group" && home && away && (
                          <select
                            value={edit.penalty}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [match.id]: { ...edit, penalty: e.target.value } }))}
                            className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-ink"
                            aria-label={`Ganador por penaltis P${match.match_number}`}
                          >
                            <option value="">Gana...</option>
                            <option value={home.id}>{home.code}</option>
                            <option value={away.id}>{away.code}</option>
                          </select>
                        )}
                        {match.is_finished && (
                          <Badge
                            variant="success-soft"
                            className="h-8 w-8 shrink-0 justify-center rounded-md p-0"
                            title="Final"
                            aria-label="Final"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </Badge>
                        )}
                        <Button
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => handleSaveResult(match)}
                          title={match.is_finished ? "Actualizar resultado" : "Guardar resultado"}
                          aria-label={match.is_finished ? "Actualizar resultado" : "Guardar resultado"}
                        >
                          {match.is_finished ? (
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Save className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                        {match.is_finished && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0 text-red hover:text-red"
                            onClick={() => handleDeleteResult(match)}
                            title="Eliminar resultado"
                            aria-label="Eliminar resultado"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {stageMatches.length === 0 && (
                  <p className="text-center text-ink-muted py-8 font-sans text-sm">
                    No hay partidos en esta fase.
                  </p>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
