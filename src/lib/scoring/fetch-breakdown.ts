import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { BREAKDOWN_TYPES, emptyBreakdown, type BreakdownType } from "@/lib/scoring/breakdown";

export type UserBreakdown = Record<BreakdownType, number>;

const VALID_TYPES = new Set<string>(BREAKDOWN_TYPES);

interface BreakdownRow {
  user_id: string;
  tipo: string;
  puntos: number;
}

// Reads the public `user_score_breakdown` view (per-user, per-type points,
// derived from score_events) for every user.
export async function fetchScoreBreakdownByUser(
  supabase: SupabaseClient
): Promise<Map<string, UserBreakdown>> {
  const { data } = await fetchAllRows<BreakdownRow>((from, to) =>
    supabase.from("user_score_breakdown").select("user_id, tipo, puntos").range(from, to)
  );

  const map = new Map<string, UserBreakdown>();
  for (const row of data ?? []) {
    if (!VALID_TYPES.has(row.tipo)) continue;
    const breakdown = map.get(row.user_id) ?? emptyBreakdown();
    breakdown[row.tipo as BreakdownType] = row.puntos;
    map.set(row.user_id, breakdown);
  }
  return map;
}

// Reads the breakdown for a single user.
export async function fetchScoreBreakdownForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<UserBreakdown> {
  const { data } = await supabase
    .from("user_score_breakdown")
    .select("tipo, puntos")
    .eq("user_id", userId);

  const breakdown = emptyBreakdown();
  for (const row of (data ?? []) as Array<{ tipo: string; puntos: number }>) {
    if (VALID_TYPES.has(row.tipo)) breakdown[row.tipo as BreakdownType] = row.puntos;
  }
  return breakdown;
}
