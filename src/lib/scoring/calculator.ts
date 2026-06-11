import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGroupStageMatch, scoreGroupPositions } from "./group-stage";
import { scoreKnockoutExact } from "./knockout";
import { scoreAwards } from "./awards";
import { scoreQualification, type PredictedKnockoutMatch } from "./qualification";
import { populateKnockoutBracket, type BracketMatch, type KnockoutPrediction } from "../tournament/bracket";
import { getBestThirds, type TeamStanding } from "../tournament/standings";

export interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

type ScoreCategory = "group_stage" | "qualification" | "knockout_exact" | "awards";

interface RecalculateAllScoresOptions {
  persistScoreEvents?: boolean;
}

function assertNoSupabaseError(error: { message?: string } | null | undefined, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message ?? String(error)}`);
  }
}

export async function recalculateAllScores(
  supabase: SupabaseClient,
  options: RecalculateAllScoresOptions = {}
): Promise<{ success: boolean; error?: string; events?: ScoreEvent[] }> {
  try {
    // Load scoring rules
    const { data: rulesData, error: rulesError } = await supabase.from("scoring_rules").select("*");
    assertNoSupabaseError(rulesError, "Error cargando reglas de puntuacion");
    const rules = new Map<string, number>();
    for (const r of rulesData || []) {
      rules.set(r.rule_key, r.points);
    }

    const { data: knockoutMatchesForPredictions, error: knockoutMatchesError } = await supabase
      .from("matches")
      .select("*")
      .neq("stage", "group")
      .order("match_number");
    assertNoSupabaseError(knockoutMatchesError, "Error cargando eliminatorias");

    const predictedMatchesByUser = await buildPredictedKnockoutMatchesByUser(
      supabase,
      knockoutMatchesForPredictions || []
    );

    const categoryScorers: Record<ScoreCategory, () => Promise<ScoreEvent[]>> = {
      group_stage: () => scoreGroupStage(supabase, rules),
      qualification: () => scoreQualification(supabase, rules, predictedMatchesByUser),
      knockout_exact: () => scoreKnockoutExactScores(supabase, rules, predictedMatchesByUser),
      awards: () => scoreAwards(supabase, rules),
    };

    const allEvents: ScoreEvent[] = [];
    const configuredCategories = Array.from(new Set((rulesData || []).map((r) => r.category as ScoreCategory)));
    for (const category of configuredCategories) {
      const scorer = categoryScorers[category];
      if (scorer) allEvents.push(...await scorer());
    }

    if (options.persistScoreEvents) {
      const { error: deleteEventsError } = await supabase
        .from("score_events")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      assertNoSupabaseError(deleteEventsError, "Error borrando eventos de puntuacion");
    }

    // Insert detailed score events only when explicitly requested. The app uses
    // the in-memory events for notifications, so persisting them on every
    // recalculation is avoidable IO.
    if (options.persistScoreEvents && allEvents.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        const { error: insertEventsError } = await supabase.from("score_events").insert(batch);
        assertNoSupabaseError(insertEventsError, "Error guardando eventos de puntuacion");
      }
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

      if (e.rule_key.startsWith("correct_sign") || e.rule_key.startsWith("exact_score") || e.rule_key.startsWith("group_pos")) {
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

    return { success: true, events: allEvents };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function calculateActualPositions(
  matches: Array<{ home_team_id: number; away_team_id: number; home_score: number; away_score: number }>
): Array<{ team_id: number; position: number }> {
  const stats = new Map<number, { points: number; gd: number; gf: number }>();

  for (const m of matches) {
    if (!stats.has(m.home_team_id)) stats.set(m.home_team_id, { points: 0, gd: 0, gf: 0 });
    if (!stats.has(m.away_team_id)) stats.set(m.away_team_id, { points: 0, gd: 0, gf: 0 });

    const home = stats.get(m.home_team_id)!;
    const away = stats.get(m.away_team_id)!;

    home.gf += m.home_score;
    home.gd += m.home_score - m.away_score;
    away.gf += m.away_score;
    away.gd += m.away_score - m.home_score;

    if (m.home_score > m.away_score) {
      home.points += 3;
    } else if (m.home_score < m.away_score) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }
  }

  const sorted = Array.from(stats.entries())
    .sort(([, a], [, b]) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

  return sorted.map(([teamId], i) => ({ team_id: teamId, position: i + 1 }));
}

async function scoreGroupStage(supabase: SupabaseClient, rules: Map<string, number>): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: groupMatches } = await supabase.from("matches").select("*").eq("stage", "group").eq("is_finished", true);
  for (const match of groupMatches || []) events.push(...await scoreGroupStageMatch(supabase, match, rules));
  const finishedGroups = new Set<string>((groupMatches || []).map((m) => m.group_letter));
  const { data: allGroupMatches } = await supabase.from("matches").select("*").eq("stage", "group");
  for (const group of Array.from(finishedGroups)) {
    const groupMs = (allGroupMatches || []).filter((m) => m.group_letter === group);
    if (groupMs.every((m) => m.is_finished)) {
      events.push(...await scoreGroupPositions(supabase, group, calculateActualPositions(groupMs), rules));
    }
  }
  return events;
}

async function scoreKnockoutExactScores(
  supabase: SupabaseClient,
  rules: Map<string, number>,
  predictedMatchesByUser: Map<string, Map<number, PredictedKnockoutMatch>>
): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: knockoutMatches } = await supabase.from("matches").select("*").neq("stage", "group").eq("is_finished", true);
  for (const match of knockoutMatches || []) {
    if (!match.home_team_id || !match.away_team_id || match.home_score === null || match.away_score === null) continue;
    events.push(...await scoreKnockoutExact(supabase, match, rules, predictedMatchesByUser));
  }
  return events;
}

async function buildPredictedKnockoutMatchesByUser(
  supabase: SupabaseClient,
  knockoutMatches: Array<{
    id: number;
    match_number: number;
    stage: string;
    home_placeholder?: string | null;
    away_placeholder?: string | null;
  }>
): Promise<Map<string, Map<number, PredictedKnockoutMatch>>> {
  const [standingsRes, bestThirdOrderRes, predictionsRes, bracketPositionsRes] = await Promise.all([
    supabase.from("predicted_group_standings").select("*"),
    supabase.from("predicted_best_third_order").select("user_id, team_id, rank"),
    supabase.from("match_predictions").select("*"),
    supabase.from("knockout_bracket_positions").select("*"),
  ]);
  assertNoSupabaseError(standingsRes.error, "Error cargando clasificaciones pronosticadas");
  assertNoSupabaseError(bestThirdOrderRes.error, "Error cargando orden de mejores terceros");
  assertNoSupabaseError(predictionsRes.error, "Error cargando predicciones");
  assertNoSupabaseError(bracketPositionsRes.error, "Error cargando posiciones del cuadro");

  const matchNumberById = new Map<number, number>();
  for (const match of knockoutMatches) {
    matchNumberById.set(match.id, match.match_number);
  }

  const groupStandingsByUser = new Map<string, Map<string, TeamStanding[]>>();
  for (const row of standingsRes.data || []) {
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
  for (const row of bestThirdOrderRes.data || []) {
    const userOrder = bestThirdOrderByUser.get(row.user_id) ?? new Map<number, number>();
    userOrder.set(row.team_id, row.rank);
    bestThirdOrderByUser.set(row.user_id, userOrder);
  }

  const predictionsByUser = new Map<string, Map<number, KnockoutPrediction>>();
  for (const row of predictionsRes.data || []) {
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
      bracketPositionsRes.data || []
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
