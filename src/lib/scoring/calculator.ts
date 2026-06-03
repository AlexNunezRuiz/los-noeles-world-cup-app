import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreGroupStageMatch, scoreGroupPositions } from "./group-stage";
import { scoreKnockoutExact } from "./knockout";
import { scoreAwards } from "./awards";
import { scoreQualification } from "./qualification";

export interface ScoreEvent {
  user_id: string;
  match_id: number;
  rule_key: string;
  points: number;
  description: string;
}

type ScoreCategory = "group_stage" | "qualification" | "knockout_exact" | "awards";

export async function recalculateAllScores(supabase: SupabaseClient): Promise<{ success: boolean; error?: string; events?: ScoreEvent[] }> {
  try {
    // Load scoring rules
    const { data: rulesData } = await supabase.from("scoring_rules").select("*");
    const rules = new Map<string, number>();
    for (const r of rulesData || []) {
      rules.set(r.rule_key, r.points);
    }

    // Clear existing score events and user scores
    await supabase.from("score_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("user_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const categoryScorers: Record<ScoreCategory, () => Promise<ScoreEvent[]>> = {
      group_stage: () => scoreGroupStage(supabase, rules),
      qualification: () => scoreQualification(supabase, rules),
      knockout_exact: () => scoreKnockoutExactScores(supabase, rules),
      awards: () => scoreAwards(supabase, rules),
    };

    const allEvents: ScoreEvent[] = [];
    const configuredCategories = Array.from(new Set((rulesData || []).map((r) => r.category as ScoreCategory)));
    for (const category of configuredCategories) {
      const scorer = categoryScorers[category];
      if (scorer) allEvents.push(...await scorer());
    }

    // Insert all score events
    if (allEvents.length > 0) {
      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        await supabase.from("score_events").insert(batch);
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
    const { data: allProfiles } = await supabase.from("profiles").select("id");
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
      await supabase.from("user_scores").upsert(scoreRows, { onConflict: "user_id" });
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

async function scoreKnockoutExactScores(supabase: SupabaseClient, rules: Map<string, number>): Promise<ScoreEvent[]> {
  const events: ScoreEvent[] = [];
  const { data: knockoutMatches } = await supabase.from("matches").select("*").neq("stage", "group").eq("is_finished", true);
  for (const match of knockoutMatches || []) events.push(...await scoreKnockoutExact(supabase, match, rules));
  return events;
}
