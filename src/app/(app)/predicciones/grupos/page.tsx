"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GroupStandingsTable } from "@/components/predictions/GroupStandingsTable";
import { MatchCard } from "@/components/predictions/match-card";
import { ScorePad } from "@/components/predictions/score-pad";
import { StageBar } from "@/components/porra/stage-bar";
import { GroupChips } from "@/components/porra/group-chips";
import { Flag } from "@/components/ui/flag";
import { Button } from "@/components/ui/button";
import { calculateGroupStandings, findTiedTeams, type TeamStanding } from "@/lib/tournament/standings";
import { useToast } from "@/components/ui/use-toast";

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

/** A side is `null` until the user actually types a value for it. */
interface Prediction {
  match_id: number;
  home_score: number | null;
  away_score: number | null;
}

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/** A prediction only counts once BOTH scores have been entered. */
function isComplete(p: Prediction | undefined): boolean {
  return p !== undefined && p.home_score !== null && p.away_score !== null;
}

export default function GruposPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Map<number, Prediction>>(new Map());
  const [standings, setStandings] = useState<Map<string, TeamStanding[]>>(new Map());
  const [isLocked, setIsLocked] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("A");
  const [editing, setEditing] = useState<{ matchId: number; side: "home" | "away" } | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout>();
  const standingsAutoSaveTimeout = useRef<NodeJS.Timeout>();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate standings when predictions change
  useEffect(() => {
    if (teams.length === 0 || matches.length === 0) return;

    const newStandings = new Map<string, TeamStanding[]>();
    for (const group of GROUPS) {
      const groupTeams = teams.filter((t) => t.group_letter === group);
      const groupMatchList = matches.filter((m) => m.group_letter === group);

      const matchResults = groupMatchList.map((m) => {
        const pred = predictions.get(m.id);
        return {
          home_team_id: m.home_team_id,
          away_team_id: m.away_team_id,
          home_score: pred?.home_score ?? 0,
          away_score: pred?.away_score ?? 0,
        };
      });

      const computed = calculateGroupStandings(
        groupTeams.map((t) => t.id),
        matchResults
      );
      newStandings.set(group, computed);
    }
    setStandings(newStandings);
  }, [teams, matches, predictions]);

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  async function savePrediction(matchId: number, homeScore: number, awayScore: number) {
    if (!userId || isLocked) return;
    setSaving(true);

    const { error } = await supabase.from("match_predictions").upsert(
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
  }

  const handleMoveTeam = useCallback(
    (group: string, teamId: number, direction: "up" | "down") => {
      setStandings((prev) => {
        const next = new Map(prev);
        const gs = [...(next.get(group) || [])];
        const idx = gs.findIndex((s) => s.team_id === teamId);
        if (idx === -1) return prev;

        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= gs.length) return prev;

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

  async function saveStandings(currentStandings: Map<string, TeamStanding[]>, silent = false) {
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

    // Solo se guardan los grupos "tocados" — con al menos un resultado completo.
    // Los grupos sin tocar no se vuelcan a clasificados ni se meten al cuadro.
    const touched = new Set<string>();
    for (const m of matches) {
      if (isComplete(predictions.get(m.id))) touched.add(m.group_letter);
    }

    for (const [group, gs] of Array.from(currentStandings.entries())) {
      if (!touched.has(group)) continue;
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

    await supabase.from("predicted_group_standings").delete().eq("user_id", userId);
    const { error } = rows.length
      ? await supabase.from("predicted_group_standings").insert(rows)
      : { error: null };

    setSaving(false);
    if (error) {
      toast({ title: "Error al guardar clasificaciones", description: error.message, variant: "destructive" });
    } else if (!silent) {
      toast({ title: "Clasificaciones guardadas" });
    }
  }

  // Auto-save standings (debounced) whenever standings change and at least one group is fully predicted
  useEffect(() => {
    if (!userId || isLocked) return;

    // Hay clasificaciones que guardar en cuanto se ha tocado algún grupo
    // (al menos un partido con resultado completo).
    const hasTouchedGroup = matches.some((m) => isComplete(predictions.get(m.id)));
    if (!hasTouchedGroup) return;

    if (standingsAutoSaveTimeout.current) clearTimeout(standingsAutoSaveTimeout.current);
    standingsAutoSaveTimeout.current = setTimeout(() => {
      saveStandings(standings, true);
    }, 1000);

    return () => {
      if (standingsAutoSaveTimeout.current) clearTimeout(standingsAutoSaveTimeout.current);
    };
  }, [standings, userId, isLocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedGroups = GROUPS.filter((g) => {
    const groupMatchList = matches.filter((m) => m.group_letter === g);
    return groupMatchList.length > 0 && groupMatchList.every((m) => isComplete(predictions.get(m.id)));
  });

  const completedCount = Array.from(predictions.values()).filter(isComplete).length;
  const groupsPct = Math.round((completedCount / 72) * 100);

  // Current group data
  const groupMatches = matches
    .filter((m) => m.group_letter === selectedGroup)
    .sort((a, b) => a.match_number - b.match_number);
  const gs = standings.get(selectedGroup) || [];
  const tiedTeams = findTiedTeams(gs).flat();

  const groupIndex = GROUPS.indexOf(selectedGroup);
  const prevGroup = groupIndex > 0 ? GROUPS[groupIndex - 1] : null;
  const nextGroup = groupIndex < GROUPS.length - 1 ? GROUPS[groupIndex + 1] : null;

  const groupPredCount = groupMatches.filter((m) => isComplete(predictions.get(m.id))).length;

  // Derive editing team + flag for the ScorePad
  const editingMatch = editing ? matches.find((m) => m.id === editing.matchId) : null;
  const editingTeamId = editingMatch
    ? editing?.side === "home"
      ? editingMatch.home_team_id
      : editingMatch.away_team_id
    : null;
  const editingTeam = editingTeamId ? teamsMap.get(editingTeamId) : null;

  function handleTileTap(matchId: number, side: "home" | "away") {
    if (isLocked) return;
    setEditing({ matchId, side });
  }

  function handleDigit(n: number) {
    if (!editing) return;
    const { matchId, side } = editing;
    const pred = predictions.get(matchId);
    const newHome = side === "home" ? n : pred?.home_score ?? null;
    const newAway = side === "away" ? n : pred?.away_score ?? null;

    setPredictions((prev) => {
      const next = new Map(prev);
      next.set(matchId, { match_id: matchId, home_score: newHome, away_score: newAway });
      return next;
    });

    // Persist only once both sides have a value — a half-filled match is not
    // a prediction yet, so nothing is written and no empty 0 is stored.
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (newHome !== null && newAway !== null) {
      saveTimeout.current = setTimeout(() => savePrediction(matchId, newHome, newAway), 800);
    }

    // Auto-advance: home → away → next match's home
    if (side === "home") {
      setEditing({ matchId, side: "away" });
    } else {
      const currentIdx = groupMatches.findIndex((m) => m.id === matchId);
      const nextMatch =
        currentIdx >= 0 && currentIdx < groupMatches.length - 1
          ? groupMatches[currentIdx + 1]
          : null;
      setEditing(nextMatch ? { matchId: nextMatch.id, side: "home" } : null);
    }
  }

  return (
    <div className={editing !== null ? "pb-44" : "pb-8"}>
      <StageBar progress={{ grupos: groupsPct }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-1">
        <h1 className="font-marcador text-3xl uppercase text-ink leading-none">
          Grupo {selectedGroup}
        </h1>
        <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-ink-muted">
          Grupo {groupIndex + 1} de {GROUPS.length} · {groupPredCount} de {groupMatches.length} partidos
          {saving && " · guardando…"}
        </p>
      </div>

      {/* Group chips */}
      <div className="px-3 pb-2">
        <GroupChips
          current={selectedGroup}
          done={completedGroups}
          onSelect={(g) => {
            setSelectedGroup(g);
            setEditing(null);
          }}
        />
      </div>

      {/* Locked notice */}
      {isLocked && (
        <div className="mx-4 mb-3 rounded-xl border border-red/30 bg-red/8 px-3 py-2">
          <p className="text-sm font-semibold text-red">Las predicciones están bloqueadas.</p>
        </div>
      )}

      {/* Match list */}
      <div className="flex flex-col gap-2 px-4">
        {groupMatches.map((match) => {
          const pred = predictions.get(match.id);
          const homeTeam = teamsMap.get(match.home_team_id);
          const awayTeam = teamsMap.get(match.away_team_id);
          if (!homeTeam || !awayTeam) return null;

          const isActive = editing?.matchId === match.id;
          const focusedSide = isActive ? editing?.side ?? null : null;

          return (
            <MatchCard
              key={match.id}
              matchNumber={match.match_number}
              matchDate={match.match_date}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeScore={pred?.home_score ?? null}
              awayScore={pred?.away_score ?? null}
              saved={isComplete(pred)}
              active={isActive}
              focusedSide={focusedSide}
              onTileTap={(side) => handleTileTap(match.id, side)}
            />
          );
        })}
      </div>

      {/* Group standings */}
      <div className="mx-4 mt-4 rounded-xl border border-border bg-surface p-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          Clasificación Grupo {selectedGroup}
        </p>
        <GroupStandingsTable
          standings={gs}
          teams={teamsMap}
          tiedTeamIds={tiedTeams}
          isLocked={isLocked}
          onMoveTeam={(teamId, dir) => handleMoveTeam(selectedGroup, teamId, dir)}
        />
      </div>

      {/* Qualify cross-link */}
      <div className="mx-4 mt-3 rounded-xl border border-blue/25 bg-blue/8 p-3">
        <p className="text-xs text-ink-muted">
          Los 2 primeros del Grupo {selectedGroup} pasan a Eliminatorias — se guarda solo.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Link href="/predicciones/eliminatorias">
            <Button size="sm" variant="default">Ver el Cuadro →</Button>
          </Link>
        </div>
      </div>

      {/* Prev / Next group navigation */}
      <div className="mx-4 mt-4 flex justify-between gap-3">
        <Button
          variant="outline"
          disabled={!prevGroup}
          onClick={() => {
            if (prevGroup) {
              setSelectedGroup(prevGroup);
              setEditing(null);
            }
          }}
        >
          ‹ Grupo {prevGroup ?? "–"}
        </Button>
        <Button
          variant="default"
          disabled={!nextGroup}
          onClick={() => {
            if (nextGroup) {
              setSelectedGroup(nextGroup);
              setEditing(null);
            }
          }}
        >
          Grupo {nextGroup ?? "–"} ›
        </Button>
      </div>

      {/* Score pad (docked) */}
      <ScorePad
        open={editing !== null}
        teamName={editingTeam?.name ?? ""}
        flag={<Flag emoji={editingTeam?.flag_emoji ?? ""} size={18} />}
        onDigit={handleDigit}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
