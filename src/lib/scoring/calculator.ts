import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGroupStageMatch, scoreGroupPositions, type MatchPredictionRow, type PredictedStandingRow } from "./group-stage";
import { scoreKnockoutExact } from "./knockout";
import { scoreQualification, type PredictedKnockoutMatch } from "./qualification";
import { scoreAwards } from "./awards";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "../tournament/bracket";
import { calculateGroupStandings, getBestThirds, type TeamStanding } from "../tournament/standings";
import { fetchAllRows } from "../supabase/fetch-all";

export interface ScoreEvent {
  user_id: string;
  match_id: number | null;
  rule_key: string;
  points: number;
  description: string;
}

type ScoreCategory = "group_stage" | "qualification" | "knockout_exact" | "awards";

interface MatchRow {
  id: number;
  match_number: number;
  stage: string;
  group_letter: string | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: number | null;
  is_finished: boolean;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
}

function assertNoSupabaseError(error: { message?: string } | null | undefined, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message ?? String(error)}`);
  }
}

export async function recalculateAllScores(supabase: SupabaseClient): Promise<{ success: boolean; error?: string; events?: ScoreEvent[] }> {
  try {
    // Load scoring rules
    const { data: rulesData, error: rulesError } = await supabase.from("scoring_rules").select("*");
    assertNoSupabaseError(rulesError, "Error cargando reglas de puntuacion");
    const rules = new Map<string, number>();
    for (const r of rulesData || []) {
      rules.set(r.rule_key, r.points);
    }

    // Todo el calendario (~104 filas) en UNA consulta; cada scorer filtra en
    // memoria. Antes cada categoria repetia su propia consulta de `matches`.
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .order("match_number");
    assertNoSupabaseError(matchesError, "Error cargando partidos");
    const allMatches = (matchesData || []) as MatchRow[];
    const groupMatches = allMatches.filter((m) => m.stage === "group");
    const knockoutMatches = allMatches.filter((m) => m.stage !== "group");

    // Tablas grandes (una fila por usuario/partido o usuario/grupo): se cargan
    // paginadas UNA sola vez y se reutilizan tanto para construir los cuadros
    // pronosticados como para puntuar signo/exacto y posiciones de grupo.
    // Antes ademas se consultaba match_predictions por cada partido (72
    // consultas) y predicted_group_standings por cada grupo (12 consultas).
    const [standingsRes, bestThirdOrderRes, predictionsRes, bracketPositionsRes] = await Promise.all([
      fetchAllRows((from, to) => supabase.from("predicted_group_standings").select("*").range(from, to)),
      fetchAllRows((from, to) =>
        supabase.from("predicted_best_third_order").select("user_id, team_id, rank").range(from, to)
      ),
      fetchAllRows((from, to) => supabase.from("match_predictions").select("*").range(from, to)),
      fetchAllRows((from, to) => supabase.from("knockout_bracket_positions").select("*").range(from, to)),
    ]);
    assertNoSupabaseError(standingsRes.error, "Error cargando clasificaciones pronosticadas");
    assertNoSupabaseError(bestThirdOrderRes.error, "Error cargando orden de mejores terceros");
    assertNoSupabaseError(predictionsRes.error, "Error cargando predicciones");
    assertNoSupabaseError(bracketPositionsRes.error, "Error cargando posiciones del cuadro");

    const standingsRows = standingsRes.data || [];
    const predictionRows = (predictionsRes.data || []) as Array<MatchPredictionRow & { penalty_winner?: "home" | "away" | null }>;

    const predictedMatchesByUser = buildPredictedKnockoutMatchesByUser(
      knockoutMatches,
      standingsRows,
      bestThirdOrderRes.data || [],
      predictionRows,
      bracketPositionsRes.data || []
    );

    const stageByMatchNumber = new Map<number, string>();
    for (const m of knockoutMatches) {
      stageByMatchNumber.set(m.match_number, m.stage);
    }

    const categoryScorers: Record<ScoreCategory, () => ScoreEvent[] | Promise<ScoreEvent[]>> = {
      group_stage: () => scoreGroupStage(groupMatches, predictionRows, standingsRows, rules),
      qualification: () => scoreQualification(knockoutMatches, rules, predictedMatchesByUser),
      knockout_exact: () => scoreKnockoutExactScores(knockoutMatches, rules, predictedMatchesByUser, stageByMatchNumber),
      awards: () => scoreAwards(supabase, rules),
    };

    const allEvents: ScoreEvent[] = [];
    const configuredCategories = Array.from(new Set((rulesData || []).map((r) => r.category as ScoreCategory)));
    for (const category of configuredCategories) {
      const scorer = categoryScorers[category];
      if (scorer) allEvents.push(...await scorer());
    }

    // Aggregate into user_scores
    const userTotals = new Map<string, {
      total: number;
      group: number;
      knockout: number;
      qualification: number;
      awards: number;
    }>();

    for (const e of allEvents) {
      const current = userTotals.get(e.user_id) || { total: 0, group: 0, knockout: 0, qualification: 0, awards: 0 };
      current.total += e.points;

      if (e.rule_key === "qualify_r32" || e.rule_key.startsWith("correct_sign") || e.rule_key.startsWith("exact_score") || e.rule_key.startsWith("group_pos")) {
        current.group += e.points;
      } else if (e.rule_key.startsWith("exact_")) {
        current.knockout += e.points;
      } else if (e.rule_key.startsWith("qualify_")) {
        current.qualification += e.points;
      } else if (["golden_boot", "golden_ball", "golden_glove"].includes(e.rule_key)) {
        current.awards += e.points;
      }

      userTotals.set(e.user_id, current);
    }

    // Also ensure all users have a score entry
    const { data: allProfiles, error: profilesError } = await supabase.from("profiles").select("id");
    assertNoSupabaseError(profilesError, "Error cargando perfiles");
    for (const p of allProfiles || []) {
      if (!userTotals.has(p.id)) {
        userTotals.set(p.id, { total: 0, group: 0, knockout: 0, qualification: 0, awards: 0 });
      }
    }

    const scoreRows = Array.from(userTotals.entries()).map(([userId, scores]) => ({
      user_id: userId,
      total_points: scores.total,
      group_stage_points: scores.group,
      knockout_exact_points: scores.knockout,
      qualification_points: scores.qualification,
      award_points: scores.awards,
    }));

    if (scoreRows.length > 0) {
      const { error: upsertScoresError } = await supabase
        .from("user_scores")
        .upsert(scoreRows, { onConflict: "user_id" });
      assertNoSupabaseError(upsertScoresError, "Error guardando clasificacion");
    }

    // Replace detailed score events only after the ranking cache is safely written.
    const { error: deleteEventsError } = await supabase
      .from("score_events")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    assertNoSupabaseError(deleteEventsError, "Error borrando eventos de puntuacion");

    if (allEvents.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        // `upsert` con `ignoreDuplicates` (ON CONFLICT DO NOTHING) sobre el índice
        // único `score_events_dedup_uniq`. Este recálculo se dispara desde el
        // cliente y no es atómico; si dos pasadas se solapan, sin esto se
        // acumulaban filas duplicadas (inflando el desglose). Ahora es
        // idempotente: un evento idéntico repetido se ignora en vez de duplicarse.
        const { error: insertEventsError } = await supabase
          .from("score_events")
          .upsert(batch, {
            onConflict: "user_id,rule_key,match_id,description",
            ignoreDuplicates: true,
          });
        assertNoSupabaseError(insertEventsError, "Error guardando eventos de puntuacion");
      }
    }

    return { success: true, events: allEvents };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function calculateActualPositions(
  matches: Array<{ home_team_id: number; away_team_id: number; home_score: number; away_score: number }>
): Array<{ team_id: number; position: number }> {
  const teamIds = Array.from(new Set(matches.flatMap((match) => [match.home_team_id, match.away_team_id])));
  return calculateGroupStandings(teamIds, matches).map((standing) => ({
    team_id: standing.team_id,
    position: standing.position,
  }));
}

function scoreGroupStage(
  groupMatches: MatchRow[],
  predictionRows: MatchPredictionRow[],
  standingsRows: PredictedStandingRow[],
  rules: Map<string, number>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];

  const predictionsByMatch = new Map<number, MatchPredictionRow[]>();
  for (const p of predictionRows) {
    const list = predictionsByMatch.get(p.match_id) ?? [];
    list.push(p);
    predictionsByMatch.set(p.match_id, list);
  }

  const finishedMatches = groupMatches.filter(
    (m): m is MatchRow & { home_team_id: number; away_team_id: number; home_score: number; away_score: number; group_letter: string } =>
      m.is_finished &&
      typeof m.home_team_id === "number" &&
      typeof m.away_team_id === "number" &&
      typeof m.home_score === "number" &&
      typeof m.away_score === "number"
  );
  for (const match of finishedMatches) {
    events.push(...scoreGroupStageMatch(match, predictionsByMatch.get(match.id) ?? [], rules));
  }

  const standingsByGroup = new Map<string, PredictedStandingRow[]>();
  for (const row of standingsRows) {
    const list = standingsByGroup.get(row.group_letter) ?? [];
    list.push(row);
    standingsByGroup.set(row.group_letter, list);
  }

  const finishedGroups = new Set<string>(finishedMatches.map((m) => m.group_letter));
  for (const group of Array.from(finishedGroups)) {
    const groupMs = groupMatches.filter((m) => m.group_letter === group);
    if (groupMs.every((m) =>
      m.is_finished &&
      typeof m.home_team_id === "number" &&
      typeof m.away_team_id === "number" &&
      typeof m.home_score === "number" &&
      typeof m.away_score === "number"
    )) {
      events.push(...scoreGroupPositions(
        group,
        calculateActualPositions(groupMs as Array<{ home_team_id: number; away_team_id: number; home_score: number; away_score: number }>),
        rules,
        standingsByGroup.get(group) ?? []
      ));
    }
  }
  return events;
}

function scoreKnockoutExactScores(
  knockoutMatches: MatchRow[],
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>,
  stageByMatchNumber: Map<number, string>
): ScoreEvent[] {
  const events: ScoreEvent[] = [];
  for (const match of knockoutMatches) {
    if (!match.is_finished) continue;
    if (!match.home_team_id || !match.away_team_id || match.home_score === null || match.away_score === null) continue;
    events.push(...scoreKnockoutExact(
      match as typeof match & { home_team_id: number; away_team_id: number; home_score: number; away_score: number },
      rules,
      predictedMatchesByUser,
      stageByMatchNumber
    ));
  }
  return events;
}

function buildPredictedKnockoutMatchesByUser(
  knockoutMatches: Array<{
    id: number;
    match_number: number;
    stage: string;
    home_placeholder?: string | null;
    away_placeholder?: string | null;
  }>,
  standingsRows: Array<{
    user_id: string;
    group_letter: string;
    team_id: number;
    position: number;
    points: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
  }>,
  bestThirdOrderRows: Array<{ user_id: string; team_id: number; rank: number }>,
  predictionRows: Array<{ user_id: string; match_id: number; home_score: number; away_score: number; penalty_winner?: "home" | "away" | null }>,
  bracketPositionRows: Array<{
    match_number: number;
    slot: "home" | "away";
    source_type: string;
    source_group?: string;
    source_match_number?: number;
    best_third_pool?: string;
  }>
): Map<string, Map<number, PredictedKnockoutMatch>> {
  const matchNumberById = new Map<number, number>();
  for (const match of knockoutMatches) {
    matchNumberById.set(match.id, match.match_number);
  }

  const groupStandingsByUser = new Map<string, Map<string, TeamStanding[]>>();
  for (const row of standingsRows) {
    const userGroups = groupStandingsByUser.get(row.user_id) ?? new Map<string, TeamStanding[]>();
    const group = row.group_letter as string;
    const standings = userGroups.get(group) ?? [];
    standings.push({
      team_id: row.team_id,
      position: row.position,
      points: row.points,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: row.goals_for,
      goals_against: row.goals_against,
      goal_difference: row.goal_difference,
    });
    standings.sort((a, b) => a.position - b.position);
    userGroups.set(group, standings);
    groupStandingsByUser.set(row.user_id, userGroups);
  }

  const bestThirdOrderByUser = new Map<string, Map<number, number>>();
  for (const row of bestThirdOrderRows) {
    const userOrder = bestThirdOrderByUser.get(row.user_id) ?? new Map<number, number>();
    userOrder.set(row.team_id, row.rank);
    bestThirdOrderByUser.set(row.user_id, userOrder);
  }

  const predictionsByUser = new Map<string, Map<number, KnockoutPrediction>>();
  for (const row of predictionRows) {
    const matchNumber = matchNumberById.get(row.match_id);
    if (!matchNumber) continue;
    const userPredictions = predictionsByUser.get(row.user_id) ?? new Map<number, KnockoutPrediction>();
    userPredictions.set(matchNumber, {
      match_id: row.match_id,
      match_number: matchNumber,
      home_score: row.home_score,
      away_score: row.away_score,
      penalty_winner: row.penalty_winner ?? undefined,
    });
    predictionsByUser.set(row.user_id, userPredictions);
  }

  const baseMatches: BracketMatch[] = knockoutMatches.map((match) => ({
    match_number: match.match_number,
    stage: match.stage,
    home_placeholder: match.home_placeholder ?? undefined,
    away_placeholder: match.away_placeholder ?? undefined,
  }));

  const result = new Map<string, Map<number, PredictedKnockoutMatch>>();
  for (const [userId, userGroupStandings] of Array.from(groupStandingsByUser.entries())) {
    const populated = populateKnockoutBracket(
      userGroupStandings,
      getBestThirds(userGroupStandings, bestThirdOrderByUser.get(userId)),
      baseMatches,
      predictionsByUser.get(userId) ?? new Map<number, KnockoutPrediction>(),
      bracketPositionRows
    );
    result.set(
      userId,
      new Map(populated.map((match) => [
        match.match_number,
        {
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_score: match.home_score,
          away_score: match.away_score,
          penalty_winner: match.penalty_winner,
        },
      ]))
    );
  }

  return result;
}
