import { populateKnockoutBracket, getMatchWinner, getMatchLoser, type BracketMatch } from "./bracket";
import { getBestThirds, type TeamStanding } from "./standings";

export interface SlotAssignment {
  match_number: number;
  slot: "home" | "away";
  // null limpia el slot (p.ej. al borrar el resultado del partido origen).
  team_id: number | null;
}

export interface ActualBracketMatch {
  match_number: number;
  stage: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score?: number | null;
  away_score?: number | null;
  penalty_winner_team_id?: number | null;
  is_finished?: boolean | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
}

export interface BracketPositionRow {
  match_number: number;
  slot: "home" | "away";
  source_type: string;
  source_group?: string;
  source_match_number?: number;
  best_third_pool?: string;
}

export function seedRound32FromGroups(
  realGroupStandings: Map<string, TeamStanding[]>,
  matches: Pick<ActualBracketMatch, "match_number" | "stage" | "home_team_id" | "away_team_id" | "home_placeholder" | "away_placeholder">[],
  bracketPositions: BracketPositionRow[]
): SlotAssignment[] {
  const baseMatches: BracketMatch[] = matches.map((m) => ({
    match_number: m.match_number,
    stage: m.stage,
    home_placeholder: m.home_placeholder ?? undefined,
    away_placeholder: m.away_placeholder ?? undefined,
  }));

  const populated = populateKnockoutBracket(
    realGroupStandings,
    getBestThirds(realGroupStandings),
    baseMatches,
    new Map(),
    bracketPositions,
    true // real bracket uses the official FIFA third-place allocation
  );

  const currentByNumber = new Map(matches.map((m) => [m.match_number, m]));
  const assignments: SlotAssignment[] = [];
  for (const pm of populated) {
    const current = currentByNumber.get(pm.match_number);
    if (!current) continue;
    // R32 slots are fully determined by group results (1st/2nd + official
    // best-third allocation), so overwrite when the computed team differs. This
    // lets a re-generation correct an earlier wrong placement.
    if (pm.home_team_id !== undefined && current.home_team_id !== pm.home_team_id) {
      assignments.push({ match_number: pm.match_number, slot: "home", team_id: pm.home_team_id });
    }
    if (pm.away_team_id !== undefined && current.away_team_id !== pm.away_team_id) {
      assignments.push({ match_number: pm.match_number, slot: "away", team_id: pm.away_team_id });
    }
  }
  return assignments;
}

export function cascadeKnockoutWinners(
  matches: ActualBracketMatch[],
  bracketPositions: BracketPositionRow[]
): SlotAssignment[] {
  const home = new Map<number, number | null>();
  const away = new Map<number, number | null>();
  const meta = new Map<number, ActualBracketMatch>();
  for (const m of matches) {
    home.set(m.match_number, m.home_team_id);
    away.set(m.match_number, m.away_team_id);
    meta.set(m.match_number, m);
  }

  // Cada slot alimentado por match_winner/match_loser es una función pura del
  // resultado del partido origen: sincronizamos (en vez de solo rellenar
  // huecos) para que corregir un resultado sobrescriba el equipo obsoleto y
  // borrar un resultado limpie los slots aguas abajo. Antes solo se rellenaban
  // huecos vacíos y una corrección (ARG-SUI de cuartos) dejaba la semifinal
  // con el ganador antiguo, puntuando mal los clasificados.
  const assignments = new Map<string, SlotAssignment>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const bp of bracketPositions) {
      if (bp.source_type !== "match_winner" && bp.source_type !== "match_loser") continue;
      if (bp.source_match_number === undefined) continue;

      const src = meta.get(bp.source_match_number);
      const srcHome = home.get(bp.source_match_number);
      const srcAway = away.get(bp.source_match_number);

      let resolved: number | null = null;
      if (src?.is_finished && srcHome != null && srcAway != null && src.home_score != null && src.away_score != null) {
        // Si el penalty_winner_team_id no coincide con ninguno de los equipos
        // actuales (dato inconsistente tras una corrección), queda sin resolver
        // en vez de avanzar al equipo equivocado.
        const penalty_winner: "home" | "away" | undefined =
          src.penalty_winner_team_id === srcHome
            ? "home"
            : src.penalty_winner_team_id === srcAway
              ? "away"
              : undefined;

        const result = { home_score: src.home_score, away_score: src.away_score, penalty_winner };
        resolved =
          (bp.source_type === "match_winner"
            ? getMatchWinner(result, srcHome, srcAway)
            : getMatchLoser(result, srcHome, srcAway)) ?? null;
      }

      const current = (bp.slot === "home" ? home.get(bp.match_number) : away.get(bp.match_number)) ?? null;
      if (current === resolved) continue;

      if (bp.slot === "home") home.set(bp.match_number, resolved);
      else away.set(bp.match_number, resolved);
      // Clave por slot: si una pasada posterior re-resuelve el mismo slot, la
      // última asignación gana en vez de emitir duplicados.
      assignments.set(`${bp.match_number}:${bp.slot}`, { match_number: bp.match_number, slot: bp.slot, team_id: resolved });
      changed = true;
    }
  }

  return Array.from(assignments.values());
}
