"use client";

import { useEffect, useRef, useState } from "react";
import { Check, RefreshCw, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag } from "@/components/ui/flag";
import { useToast } from "@/components/ui/use-toast";
import { recalculateAllScores, type ScoreEvent } from "@/lib/scoring/calculator";
import { runRecalculationBeforeNotifications } from "@/lib/admin/result-recalculation";
import {
  assertNotificationInsertSucceeded,
  buildNotificationRows,
  scoreEventsForMatchNotifications,
} from "@/lib/notifications/internal";
import { groupByMatchDay } from "@/lib/datetime";
import { getAutoScrollDay, sortMatchesByCalendar } from "@/lib/calendar/match-position";
import { stageLabel } from "@/lib/tournament/labels";
import { buildRealGroupStandings } from "@/lib/results/group-standings";
import { seedRound32FromGroups, cascadeKnockoutWinners, type ActualBracketMatch, type BracketPositionRow, type SlotAssignment } from "@/lib/tournament/actual-bracket";

interface Team {
  id: number;
  name: string;
  code: string;
  flag_emoji: string;
  group_letter: string | null;
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
  match_date: string | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: number | null;
  is_finished: boolean;
}

export default function AdminResultadosPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [editing, setEditing] = useState<Record<number, { home: string; away: string; penalty: string }>>({});
  const [recalculating, setRecalculating] = useState(false);
  const [bracketPositions, setBracketPositions] = useState<BracketPositionRow[]>([]);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const hasAutoScrolled = useRef(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [teamsRes, matchesRes, positionsRes] = await Promise.all([
        supabase.from("teams").select("id, name, code, flag_emoji, group_letter").order("id"),
        supabase.from("matches").select("*").order("match_number"),
        supabase.from("knockout_bracket_positions").select("*"),
      ]);
      setTeams(teamsRes.data || []);
      setMatches(matchesRes.data || []);
      setBracketPositions((positionsRes.data || []) as BracketPositionRow[]);
    }
    load();
  }, []);

  useEffect(() => {
    if (hasAutoScrolled.current || matches.length === 0) return;
    const targetDay = getAutoScrollDay(matches);
    if (!targetDay) return;

    hasAutoScrolled.current = true;
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-day="${targetDay}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [matches]);

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

  const persistSlotAssignments = async (assignments: SlotAssignment[]) => {
    if (assignments.length === 0) return;
    for (const a of assignments) {
      const column = a.slot === "home" ? "home_team_id" : "away_team_id";
      const { error } = await supabase.from("matches").update({ [column]: a.team_id }).eq("match_number", a.match_number);
      if (error) {
        toast({ title: "Error rellenando el cuadro", description: error.message, variant: "destructive" });
        return;
      }
    }
    setMatches((prev) =>
      prev.map((m) => {
        const forMatch = assignments.filter((a) => a.match_number === m.match_number);
        if (forMatch.length === 0) return m;
        const next = { ...m };
        for (const a of forMatch) {
          if (a.slot === "home") next.home_team_id = a.team_id;
          else next.away_team_id = a.team_id;
        }
        return next;
      })
    );
  };

  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    const realStandings = buildRealGroupStandings(
      teams.map((t) => ({ id: t.id, name: t.name, flag_emoji: t.flag_emoji, group_letter: t.group_letter })),
      matches.map((m) => ({
        group_letter: m.group_letter,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_score: m.home_score,
        away_score: m.away_score,
        is_finished: m.is_finished,
      }))
    );

    const seed = seedRound32FromGroups(
      realStandings,
      matches.map((m) => ({
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      })),
      bracketPositions
    );
    await persistSlotAssignments(seed);

    const seeded: ActualBracketMatch[] = matches.map((m) => {
      const forMatch = seed.filter((a) => a.match_number === m.match_number);
      let homeId = m.home_team_id;
      let awayId = m.away_team_id;
      for (const a of forMatch) {
        if (a.slot === "home") homeId = a.team_id;
        else awayId = a.team_id;
      }
      return {
        match_number: m.match_number,
        stage: m.stage,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: m.home_score,
        away_score: m.away_score,
        penalty_winner_team_id: m.penalty_winner_team_id,
        is_finished: m.is_finished,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
      };
    });
    const cascade = cascadeKnockoutWinners(seeded, bracketPositions);
    await persistSlotAssignments(cascade);

    await recalculateAllScores(supabase);
    setGeneratingBracket(false);
    toast({ title: `Cuadro actualizado (${seed.length + cascade.length} equipos colocados)` });
  };

  const handleAssignTeam = async (match: Match, slot: "home" | "away", teamId: number) => {
    if (!teamId) return;
    const column = slot === "home" ? "home_team_id" : "away_team_id";
    const { error } = await supabase.from("matches").update({ [column]: teamId }).eq("id", match.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, [column]: teamId } : m)));
    toast({ title: `Equipo asignado en P${match.match_number}` });
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
      if (updatedMatch.stage !== "group") {
        const nextMatches: ActualBracketMatch[] = matches.map((m) => {
          const base = m.id === match.id ? { ...m, ...updates } : m;
          return {
            match_number: base.match_number,
            stage: base.stage,
            home_team_id: base.home_team_id,
            away_team_id: base.away_team_id,
            home_score: base.home_score,
            away_score: base.away_score,
            penalty_winner_team_id: base.penalty_winner_team_id,
            is_finished: base.is_finished,
            home_placeholder: base.home_placeholder,
            away_placeholder: base.away_placeholder,
          };
        });
        await persistSlotAssignments(cascadeKnockoutWinners(nextMatches, bracketPositions));
      }
      await runRecalculationBeforeNotifications<ScoreEvent>({
        recalculate: () => recalculateAllScores(supabase),
        publishNotifications: async (recalc) => {
          const actorUserId = await publishGlobalNotification({
            type: "result_update",
            title: "Nuevo resultado",
            body: `Resultado actualizado: ${matchLabel(updatedMatch)}`,
            link: "/resultados",
          });
          await publishCorrectPredictionNotifications(updatedMatch, actorUserId, recalc.events ?? []);
          await publishGlobalNotification({
            type: "ranking_update",
            title: "Clasificacion actualizada",
            body: "La clasificacion se ha actualizado tras el ultimo resultado.",
            link: "/ranking",
          });
        },
        onRecalculateError: (error) => {
          toast({
            title: "Resultado guardado, pero no se recalculo la clasificacion",
            description: error,
            variant: "destructive",
          });
        },
        onNotificationError: (notificationError) => {
          toast({
            title: "Clasificacion recalculada, pero fallo la notificacion",
            description:
              notificationError instanceof Error
                ? notificationError.message
                : "No se pudieron crear las notificaciones internas.",
            variant: "destructive",
          });
        },
      });
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

    await runRecalculationBeforeNotifications<ScoreEvent>({
      recalculate: () => recalculateAllScores(supabase),
      publishNotifications: async () => {
        await publishGlobalNotification({
          type: "result_update",
          title: "Resultado eliminado",
          body: `Resultado eliminado: P${match.match_number}`,
          link: "/resultados",
        });
        await publishGlobalNotification({
          type: "ranking_update",
          title: "Clasificacion actualizada",
          body: "La clasificacion se ha actualizado tras eliminar un resultado.",
          link: "/ranking",
        });
      },
      onRecalculateError: (error) => {
        toast({
          title: "Resultado eliminado, pero no se recalculo la clasificacion",
          description: error,
          variant: "destructive",
        });
      },
      onNotificationError: (notificationError) => {
        toast({
          title: "Clasificacion recalculada, pero fallo la notificacion",
          description:
            notificationError instanceof Error
              ? notificationError.message
              : "No se pudieron crear las notificaciones internas.",
          variant: "destructive",
        });
      },
    });
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

  const sortedMatches = sortMatchesByCalendar(matches);
  const datedMatches = sortedMatches.filter(
    (match): match is Match & { match_date: string } => Boolean(match.match_date)
  );
  const undatedMatches = sortedMatches.filter((match) => !match.match_date);
  const matchGroups = groupByMatchDay(datedMatches);

  const renderMatchCard = (match: Match) => {
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
          <span className="flex w-20 shrink-0 flex-col">
            <span className="font-marcador text-xs text-ink-faint">P{match.match_number}</span>
            <span className="truncate text-[9px] font-bold uppercase tracking-wide text-ink-faint">
              {stageLabel(match.stage, match.group_letter)}
            </span>
          </span>

          <span className="text-sm flex-1 min-w-0 truncate flex items-center gap-1 text-ink font-sans">
            {home ? (
              <><Flag emoji={home.flag_emoji} size={16} />{home.code}</>
            ) : match.stage !== "group" ? (
              <select
                value=""
                onChange={(e) => handleAssignTeam(match, "home", parseInt(e.target.value))}
                className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-ink"
                aria-label={`Equipo local P${match.match_number}`}
              >
                <option value="">{match.home_placeholder || "TBD"}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.code}</option>
                ))}
              </select>
            ) : (
              match.home_placeholder || "TBD"
            )}
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
            {away ? (
              <>{away.code}<Flag emoji={away.flag_emoji} size={16} /></>
            ) : match.stage !== "group" ? (
              <select
                value=""
                onChange={(e) => handleAssignTeam(match, "away", parseInt(e.target.value))}
                className="h-8 rounded-md border border-border bg-surface px-1 text-xs text-ink"
                aria-label={`Equipo visitante P${match.match_number}`}
              >
                <option value="">{match.away_placeholder || "TBD"}</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.code}</option>
                ))}
              </select>
            ) : (
              match.away_placeholder || "TBD"
            )}
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-marcador font-bold uppercase tracking-wide text-2xl text-ink">Resultados</h1>
        <div className="flex items-center gap-2">
          <Button onClick={handleGenerateBracket} disabled={generatingBracket} variant="outline">
            {generatingBracket ? "Generando..." : "Generar cuadro real"}
          </Button>
          <Button onClick={handleRecalculate} disabled={recalculating} variant="default">
            {recalculating ? "Recalculando..." : "Recalcular Puntuaciones"}
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {matchGroups.map((group) => (
          <section key={group.key} data-day={group.key} className="scroll-mt-16">
            <div className="sticky top-14 z-10 -mx-1 bg-cream/95 px-1 py-1.5 backdrop-blur md:top-0">
              <h2 className="font-marcador text-sm font-bold uppercase tracking-wide text-ink">
                {group.label}
              </h2>
            </div>
            <div className="mt-1 space-y-2">
              {group.matches.map(renderMatchCard)}
            </div>
          </section>
        ))}

        {undatedMatches.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-marcador text-sm font-bold uppercase tracking-wide text-ink">
              Sin fecha
            </h2>
            {undatedMatches.map(renderMatchCard)}
          </section>
        )}

        {matches.length === 0 && (
          <p className="text-center text-ink-muted py-8 font-sans text-sm">
            No hay partidos disponibles.
          </p>
        )}
      </div>
    </div>
  );
}
