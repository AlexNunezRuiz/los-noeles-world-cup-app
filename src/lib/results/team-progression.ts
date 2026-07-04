import type { BuiltUserBracket } from "@/lib/results/user-bracket";
import type { PredictedKnockoutMatch } from "@/lib/scoring/qualification";

/** Rondas eliminatorias en las que un equipo puede "quedarse". */
export type ReachStage =
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final";

/**
 * Hasta dónde lleva un usuario a una selección según su cuadro predicho.
 *  - champion / runner_up: gana / pierde la final.
 *  - third / fourth: gana / pierde el partido por el 3er puesto.
 *  - semifinalist: llega a semis (3er puesto sin resultado, o pierde semis sin
 *    partido de 3er puesto resuelto).
 *  - eliminated: cae en R32/R16/QF con resultado predicho.
 *  - reached: llega a una ronda pero la siguiente aún no está resuelta.
 *  - none: no aparece en eliminatorias (fase de grupos / no clasifica).
 */
export type TeamReach =
  | { kind: "champion" }
  | { kind: "runner_up" }
  | { kind: "third" }
  | { kind: "fourth" }
  | { kind: "semifinalist" }
  | { kind: "eliminated"; stage: ReachStage }
  | { kind: "reached"; stage: ReachStage }
  | { kind: "none" };

const STAGE_RANK: Record<string, number> = {
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 5,
  final: 5,
};

const NEXT_STAGE: Record<string, ReachStage> = {
  round_of_32: "round_of_16",
  round_of_16: "quarter_final",
  quarter_final: "semi_final",
  semi_final: "final",
};

/** Equipo ganador del partido predicho, o null si no está resuelto. */
function winnerOf(match: PredictedKnockoutMatch): number | null {
  if (match.home_team_id == null || match.away_team_id == null) return null;
  if (match.home_score == null || match.away_score == null) return null;
  if (match.home_score > match.away_score) return match.home_team_id;
  if (match.away_score > match.home_score) return match.away_team_id;
  if (match.penalty_winner === "home") return match.home_team_id;
  if (match.penalty_winner === "away") return match.away_team_id;
  return null;
}

export function teamFurthestReach(
  bracket: BuiltUserBracket,
  teamId: number
): TeamReach {
  const { byMatchNumber, stageByMatchNumber } = bracket;

  // Partido de ronda más profunda donde aparece el equipo.
  let deepestMatchNumber: number | null = null;
  let deepestRank = 0;
  for (const [matchNumber, match] of Array.from(byMatchNumber.entries())) {
    if (match.home_team_id !== teamId && match.away_team_id !== teamId) continue;
    const stage = stageByMatchNumber.get(matchNumber) ?? "";
    const rank = STAGE_RANK[stage] ?? 0;
    if (rank > deepestRank) {
      deepestRank = rank;
      deepestMatchNumber = matchNumber;
    }
  }

  if (deepestMatchNumber === null) return { kind: "none" };

  const match = byMatchNumber.get(deepestMatchNumber)!;
  const stage = stageByMatchNumber.get(deepestMatchNumber) ?? "";
  const winner = winnerOf(match);
  const decided = winner !== null;
  const won = winner === teamId;

  if (stage === "final") {
    if (!decided) return { kind: "reached", stage: "final" };
    return won ? { kind: "champion" } : { kind: "runner_up" };
  }
  if (stage === "third_place") {
    if (!decided) return { kind: "semifinalist" };
    return won ? { kind: "third" } : { kind: "fourth" };
  }
  if (stage === "semi_final") {
    if (!decided) return { kind: "reached", stage: "semi_final" };
    return won ? { kind: "reached", stage: "final" } : { kind: "semifinalist" };
  }

  // round_of_32 / round_of_16 / quarter_final
  const s = stage as ReachStage;
  if (!decided) return { kind: "reached", stage: s };
  return won
    ? { kind: "reached", stage: NEXT_STAGE[stage] ?? s }
    : { kind: "eliminated", stage: s };
}

export interface ReachDisplay {
  /** Etiqueta corta en español. */
  label: string;
  /** Profundidad 0 (no clasifica) … 8 (campeón), para color/orden secundario. */
  depth: number;
}

const STAGE_LABEL: Record<ReachStage, string> = {
  round_of_32: "Dieciseisavos",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinalista",
  final: "Finalista",
};

const STAGE_DEPTH: Record<ReachStage, number> = {
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  final: 6,
};

export function reachDisplay(reach: TeamReach): ReachDisplay {
  switch (reach.kind) {
    case "champion":
      return { label: "Campeón", depth: 8 };
    case "runner_up":
      return { label: "Subcampeón", depth: 7 };
    case "third":
      return { label: "3er puesto", depth: 5 };
    case "fourth":
      return { label: "4º puesto", depth: 4 };
    case "semifinalist":
      return { label: "Semifinalista", depth: 4 };
    case "eliminated":
      return { label: STAGE_LABEL[reach.stage], depth: STAGE_DEPTH[reach.stage] };
    case "reached":
      return { label: STAGE_LABEL[reach.stage], depth: STAGE_DEPTH[reach.stage] };
    case "none":
      return { label: "No la clasifica", depth: 0 };
  }
}
